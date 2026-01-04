#!/bin/bash

# OmniASR Quick Start Script
# This script helps you quickly start the OmniASR application

set -e

echo "🚀 OmniASR Quick Start"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js is not installed. Please install Node.js 18+ first.${NC}"
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js version: $(node --version)"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    echo ""
fi

echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Display backend URL
echo -e "${BLUE}🔗 Your Backend URL:${NC}"
echo "   https://ahmedezzat0247--omniasr-llm-7b-fastapi-app.modal.run"
echo ""

# Start the development server
echo -e "${BLUE}🎨 Starting frontend development server...${NC}"
echo ""
echo -e "${GREEN}➜${NC} The app will open at: ${GREEN}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Enter backend URL: https://ahmedezzat0247--omniasr-llm-7b-fastapi-app.modal.run"
echo "   3. Click 'Connect'"
echo "   4. Upload an audio file and transcribe!"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

npm run dev
