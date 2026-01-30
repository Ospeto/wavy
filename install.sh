#!/bin/bash

# Wavy Bot Installation Script
# This script sets up the environment and deploys the Telegram bot using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   █     █  █████  █   █  █   █                           ║"
echo "║   █     █  █   █  █   █   █ █                            ║"
echo "║   █  █  █  █████  █   █    █                             ║"
echo "║   █ █ █ █  █   █   █ █    █ █                            ║"
echo "║    █   █   █   █    █    █   █                           ║"
echo "║                                                           ║"
echo "║         VPN Telegram Bot - Installation                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for Docker
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

echo ""

# Check if .env already exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠ An existing .env file was found.${NC}"
    read -p "Do you want to reconfigure it? (y/N): " RECONFIGURE
    if [[ ! "$RECONFIGURE" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Keeping existing configuration.${NC}"
        SKIP_ENV=true
    fi
fi

if [ "$SKIP_ENV" != "true" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Environment Configuration${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Telegram Bot Token
    echo -e "${YELLOW}1. Telegram Bot Token ${RED}(Required)${NC}"
    echo "   Get your token from @BotFather on Telegram:"
    echo "   1. Open Telegram and search for @BotFather"
    echo "   2. Send /newbot and follow instructions"
    echo "   3. Copy the token provided"
    while [ -z "$TELEGRAM_BOT_TOKEN" ]; do
        read -p "   Bot Token: " TELEGRAM_BOT_TOKEN
        if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
            echo -e "${RED}   ✗ Bot Token is required!${NC}"
        fi
    done
    echo -e "${GREEN}   ✓ Bot Token set${NC}"
    echo ""

    # Remnawave API URL
    echo -e "${YELLOW}2. Remnawave Panel URL${NC}"
    echo "   Press Enter to use default: https://rempanel.yamoe.xyz"
    read -p "   Panel URL: " REMNAWAVE_API_URL
    REMNAWAVE_API_URL=${REMNAWAVE_API_URL:-"https://rempanel.yamoe.xyz"}
    echo -e "${GREEN}   ✓ Set to: $REMNAWAVE_API_URL${NC}"
    echo ""

    # Remnawave API Key
    echo -e "${YELLOW}3. Remnawave API Key ${RED}(Required)${NC}"
    echo "   You can find this in your Remnawave panel settings."
    while [ -z "$REMNAWAVE_API_KEY" ]; do
        read -p "   API Key: " REMNAWAVE_API_KEY
        if [ -z "$REMNAWAVE_API_KEY" ]; then
            echo -e "${RED}   ✗ API Key is required!${NC}"
        fi
    done
    echo -e "${GREEN}   ✓ API Key set (${#REMNAWAVE_API_KEY} characters)${NC}"
    echo ""

    # Gemini API Key
    echo -e "${YELLOW}4. Google Gemini API Key ${RED}(Required)${NC}"
    echo "   Get your API key from: https://aistudio.google.com/apikey"
    while [ -z "$GEMINI_API_KEY" ]; do
        read -p "   API Key: " GEMINI_API_KEY
        if [ -z "$GEMINI_API_KEY" ]; then
            echo -e "${RED}   ✗ API Key is required!${NC}"
        fi
    done
    echo -e "${GREEN}   ✓ API Key set (${#GEMINI_API_KEY} characters)${NC}"
    echo ""

    # Admin User IDs
    echo -e "${YELLOW}5. Admin User IDs${NC}"
    echo "   Enter comma-separated Telegram User IDs (e.g. 532666374,12345678)"
    echo "   Press Enter to skip if no admins are needed yet."
    read -p "   Admin IDs: " ADMIN_USER_IDS
    echo -e "${GREEN}   ✓ Admin IDs set${NC}"
    echo ""

    # Create .env file
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Creating .env file...${NC}"

    cat > .env << EOF
# Wavy Bot Environment Configuration
# Generated by install.sh on $(date)

# Telegram Bot Token
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN

# Remnawave API Configuration
REMNAWAVE_API_URL=$REMNAWAVE_API_URL
REMNAWAVE_API_KEY=$REMNAWAVE_API_KEY

# Gemini AI API Key
GEMINI_API_KEY=$GEMINI_API_KEY

# Admin Configuration
ADMIN_USER_IDS=$ADMIN_USER_IDS
EOF

    echo -e "${GREEN}✓ .env file created successfully${NC}"
    echo ""
fi

# Update source code
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Checking for updates...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if command -v git &> /dev/null; then
    echo -e "${YELLOW}Pulling latest changes...${NC}"
    git pull || echo -e "${RED}⚠ Failed to pull latest changes. Continuing with current version...${NC}"
else
    echo -e "${YELLOW}⚠ Git is not installed. Skipping update check.${NC}"
fi
echo ""

# Build and deploy
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Building and deploying Wavy Bot...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "Do you want to build and start the bot now? (Y/n): " START_NOW
if [[ ! "$START_NOW" =~ ^[Nn]$ ]]; then
    echo ""
    echo -e "${YELLOW}Building container (this may take a few minutes)...${NC}"
    
    if docker compose version &> /dev/null; then
        docker compose build
        echo ""
        echo -e "${YELLOW}Starting bot...${NC}"
        docker compose up -d
    else
        docker-compose build
        echo ""
        echo -e "${YELLOW}Starting bot...${NC}"
        docker-compose up -d
    fi

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ Wavy Bot has been deployed successfully!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}Your bot is now running on Telegram!${NC}"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo "   View logs:     docker-compose logs -f"
    echo "   Stop:          docker-compose down"
    echo "   Restart:       docker-compose restart"
    echo ""
    echo -e "${YELLOW}💡 Transaction logs are stored in the Docker volume 'wavy-data'${NC}"
    echo ""
else
    echo ""
    echo -e "${GREEN}✓ Configuration complete!${NC}"
    echo ""
    echo -e "${BLUE}To start the bot later, run:${NC}"
    echo "   docker-compose build"
    echo "   docker-compose up -d"
    echo ""
fi

echo -e "${YELLOW}Thank you for using Wavy Bot! 🌊${NC}"
