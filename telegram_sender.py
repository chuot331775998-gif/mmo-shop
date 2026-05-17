#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MMO Shop Telegram Notifier
Tự động gửi thông báo Telegram khi có user đăng ký mới
"""

import json5
import time
import os
import re
from pathlib import Path
import requests
from datetime import datetime

# Config
BOT_TOKEN = "8966694050:AAGNYqeFjR3dl7Un5mmzlBtqmjLaMnt8do0"
CHAT_ID = "7856340376"
DATA_FILE = r"C:\Users\Chuot.DGNCL\Desktop\MMO-Shop\js\data.js"
NOTIFIED_USERS = set()  # Lưu user đã gửi notification

def load_data():
    """Load dữ liệu từ data.js"""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
            # Tìm vị trí bắt đầu object
            start = content.find('const INITIAL_DATA =')
            if start == -1:
                raise Exception("Không tìm thấy INITIAL_DATA")
            start = content.find('{', start)
            # Đếm ngoặc để lấy hết object
            brace = 0
            end = start
            for i, c in enumerate(content[start:]):
                if c == '{':
                    brace += 1
                elif c == '}':
                    brace -= 1
                    if brace == 0:
                        end = start + i + 1
                        break
            json_str = content[start:end]
            # Parse bằng json5
            data = json5.loads(json_str)
            return data
    except Exception as e:
        print(f"❌ Lỗi đọc file: {e}")
    return None

def send_telegram(message):
    """Gửi message Telegram"""
    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        }
        response = requests.post(url, json=payload, timeout=5)
        if response.status_code == 200:
            print(f"✅ Gửi Telegram thành công")
            return True
        else:
            print(f"❌ Lỗi Telegram: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Lỗi gửi Telegram: {e}")
        return False

def check_new_users():
    """Kiểm tra user đăng ký mới"""
    global NOTIFIED_USERS
    
    data = load_data()
    if not data or 'users' not in data:
        return
    
    users = data.get('users', [])
    
    for user in users:
        user_id = user.get('id')
        
        # Skip nếu đã gửi notification cho user này
        if user_id in NOTIFIED_USERS:
            continue
        
        # Gửi notification
        username = user.get('username', 'N/A')
        fullname = user.get('fullname', 'N/A')
        email = user.get('email', 'N/A')
        phone = user.get('phone', 'Không cung cấp')
        created_at = user.get('createdAt', 'N/A')
        
        # Format thời gian
        try:
            dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            time_str = dt.strftime("%d/%m/%Y %H:%M:%S")
        except:
            time_str = created_at
        
        message = f"""🎉 <b>Đăng ký thành viên mới</b>

👤 Tên: <b>{fullname}</b>
👤 Username: <b>@{username}</b>
📧 Email: <b>{email}</b>
📱 SĐT: <b>{phone}</b>
⏰ Thời gian: <b>{time_str}</b>"""
        
        print(f"\n📤 Gửi thông báo cho user: {username}")
        if send_telegram(message):
            NOTIFIED_USERS.add(user_id)
            print(f"✅ Đánh dấu đã thông báo user ID: {user_id}")

def main():
    """Main loop"""
    print("=" * 50)
    print("🤖 MMO Shop Telegram Notifier")
    print("=" * 50)
    print(f"📁 Data file: {DATA_FILE}")
    print(f"🔔 Chat ID: {CHAT_ID}")
    print(f"🕐 Kiểm tra mỗi 5 giây...")
    print("=" * 50)
    
    if not os.path.exists(DATA_FILE):
        print(f"❌ File không tìm thấy: {DATA_FILE}")
        return
    
    try:
        while True:
            check_new_users()
            time.sleep(5)  # Kiểm tra mỗi 5 giây
    except KeyboardInterrupt:
        print("\n\n👋 Dừng chương trình")
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")

if __name__ == "__main__":
    main()
