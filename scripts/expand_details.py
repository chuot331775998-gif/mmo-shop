import re
from pathlib import Path

file_path = Path(__file__).parent.parent / 'js' / 'data.js'
text = file_path.read_text(encoding='utf-8')

# regex captures the details string content (non-greedy) before , price:
pattern = re.compile(r"details:\s*\"([\s\S]*?)\"\s*,\s*price:")

def is_already_expanded(s):
    # if starts with emoji or known header, skip
    return s.strip().startswith(('🌟', '📊', '🎯', '💎', '🔐', '🏆', '🎮', '👑', '⚡', '❄️', '🎖️'))

count = 0

def make_expanded(old):
    # Unescape existing \n into real newlines for processing
    old_plain = old.replace('\\n', '\n')
    # Build new detailed template using existing bullets as base
    new = []
    new.append('📋 CHI TIẾT SẢN PHẨM:')
    new.append('')
    # preserve original content under a section
    new.append('🔎 MÔ TẢ NGẮN:')
    for line in old_plain.split('\n'):
        line = line.strip()
        if line:
            new.append(line)
    new.append('')
    new.append('🎯 LỢI ÍCH & ỨNG DỤNG:')
    new.append('• Sẵn sàng sử dụng ngay; phù hợp nhiều mục đích (cày, stream, tặng, v.v.)')
    new.append('• Tiết kiệm thời gian so với tự xây/đào tài khoản hoặc mua lẻ')
    new.append('')
    new.append('🔐 BẢO MẬT & GIAO HÀNG:')
    new.append('• Email/Recovery: kèm theo nếu có; hướng dẫn đổi pass sau khi nhận')
    new.append('• 2FA: đã xử lý để dễ truy cập (nếu có sẽ hướng dẫn bật lại)')
    new.append('• Bảo hành: 3-14 ngày tuỳ loại sản phẩm (xem chi tiết sản phẩm)')
    new.append('')
    new.append('📌 LƯU Ý:')
    new.append('• Liên hệ support nếu cần hướng dẫn transfer hoặc gặp sự cố')
    new.append('• Mọi giao dịch được ghi nhận và hỗ trợ đổi trả theo chính sách')

    new_plain = '\n'.join(new)
    # Escape backslashes and double quotes, and convert newlines to \n for JS string
    new_escaped = new_plain.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    return new_escaped


def repl(m):
    global count
    old = m.group(1)
    if is_already_expanded(old):
        return m.group(0)  # no change
    new = make_expanded(old)
    count += 1
    return f'details: "{new}", price:'

new_text = pattern.sub(repl, text)

file_path.write_text(new_text, encoding='utf-8')
print(f"Expanded details for {count} products.")
