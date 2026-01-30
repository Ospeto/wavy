# 🌊 Wavy VPN Bot

A professional Telegram bot for automated VPN subscription sales with AI-powered fraud detection and Remnawave integration.

---

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Resource Requirements](#resource-requirements)
3. [Deployment Guide](#deployment-guide)
4. [Usage Guide (Users)](#usage-guide-users)
5. [Usage Guide (Admins)](#usage-guide-admins)
6. [Fraud Detection System](#fraud-detection-system)
7. [Environment Configuration](#environment-configuration)
8. [Maintenance & Commands](#maintenance--commands)

---

## 🛠 System Overview

Wavy Bot automates the entire process of selling VPN subscriptions. It handles plan selection, payment receipt verification using **Google Gemini AI**, and instant key generation via the **Remnawave API**.

### Core Components:
- **Telegram Bot**: Built with `Grammy` for a smooth, conversational user experience.
- **AI Engine**: `Gemini 2.0 Flash` for sub-second image analysis and fraud detection.
- **Backend Service**: `Node.js` service managing state and API integrations.
- **Database**: High-performance local JSON-based storage for transaction history.

---

## 🖥 Resource Requirements

Wavy is lightweight and designed to run on minimal hardware (VPS).

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 0.5 Core | 1 Core |
| **RAM** | 512 MB | 1 GB |
| **Storage** | 2 GB | 5 GB |
| **OS** | Linux (Ubuntu/Debian) | Docker-compatible |

---

## 🚀 Deployment Guide

### 1. Prerequisites
- A Telegram bot token from [@BotFather](https://t.me/BotFather).
- [Google AI Studio API Key](https://aistudio.google.com/apikey).
- Remnawave Panel access with an API Key.

### 2. Quick Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/wavy.git
cd wavy

# Run the automated installer
chmod +x install.sh
./install.sh
```

### 3. Verification
After installation, check the logs to ensure the bot is running:
```bash
docker compose logs -f
```

---

## 📱 Usage Guide (Users)

1. **Start**: Send `/start` to the bot.
2. **Install Client**: [Download Happ Proxy for Android](https://play.google.com/store/apps/details?id=com.happproxy&hl=en) or [iOS](https://apps.apple.com/sg/app/happ-proxy-utility/id6504287215).
3. **Select Plan**: Choose from available Lite or Unlimited plans.
4. **Choose Payment**: Select KBZPay, Wave Money, or Aya Pay.
5. **Make Payment**: Send the exact amount to the provided account details.
6. **Upload Screenshot**: Send the payment receipt photo to the bot.
7. **Verification**: Wait 3-5 seconds for AI verification.
8. **Get Key**: Receive your subscription URL instantly if valid.
9. **Setup**: Copy the URL, open **Happ Proxy**, and add the subscription.

---

## 🛡 Usage Guide (Admins)

Admin commands are restricted to User IDs specified in the `ADMIN_USER_IDS` variable.

### Commands:
- `/admin`: Shows a summary of system health and transaction statistics.
- `/admin_tx`: Lists the 10 most recent transactions with user details, TxIDs, and keys.

### Setting up Admins:
Edit your `.env` file and add your Telegram ID:
```env
ADMIN_USER_IDS=12345678,98765432
```

---

## 🧠 Fraud Detection System

Wavy uses a strict AI-driven verification logic (Gemini 2.0 Flash) to prevent fraudulent transactions.

### What the AI checks:
- **App UI Match**: Rejects KBZPay screenshots if the user selected Wave Money.
- **Date/Time**: Payment must be within the **last 2 hours** (Myanmar Time).
- **Image Integrity**: Detects font mismatches, pixelation around numbers, and digital manipulation.
- **Status**: Must show a successful transaction ("ငွေလွှဲပြီးပါပြီ" or "Success").
- **Uniqueness**: Transaction IDs are checked against the database to prevent double-spending.

---

## ⚙️ Environment Configuration

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Your bot's secret token. |
| `REMNAWAVE_API_KEY` | API key from your Remnawave panel. |
| `GEMINI_API_KEY` | API key for Google Gemini AI. |
| `REMNAWAVE_API_URL` | Your Remnawave panel URL. |
| `ADMIN_USER_IDS` | Comma-separated list of admin Telegram IDs. |

---

## 🏗 Maintenance & Commands

### Docker Management
```bash
# Rebuild and apply changes
docker compose build --no-cache && docker compose up -d

# View real-time logs
docker compose logs -f

# Stop the bot
docker compose down
```

### Transaction History
Admins can use `/admin_tx` to view history. For raw data, the database is persisted in the `wavy-data` Docker volume.

---
Made with 🌊 by Wavy Team | Myanmar VPN Automation
