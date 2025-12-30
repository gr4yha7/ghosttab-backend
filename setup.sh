#!/bin/bash

echo "🚀 Setting up GhostTab Backend..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "${YELLOW}📦 Installing root dependencies...${NC}"
    npm install
else
    echo "${GREEN}✓ Root dependencies already installed${NC}"
fi

# Build common package first
echo "${YELLOW}🔨 Building common package...${NC}"
cd packages/common
npm install
npm run build

if [ $? -eq 0 ]; then
    echo "${GREEN}✓ Common package built successfully${NC}"
else
    echo "${RED}✗ Failed to build common package${NC}"
    exit 1
fi

cd ../..

# Install dependencies for all services
echo "${YELLOW}📦 Installing service dependencies...${NC}"
npm install --workspaces

# Build all services
echo "${YELLOW}🔨 Building all services...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo "${GREEN}✓ All services built successfully${NC}"
else
    echo "${RED}✗ Failed to build services${NC}"
    exit 1
fi

echo ""
echo "${GREEN}✨ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and fill in your credentials"
echo "   ${YELLOW}cp .env.example .env${NC}"
echo ""
echo "2. Start Redis:"
echo "   ${YELLOW}docker-compose up -d redis${NC}"
echo ""
echo "3. Run database migrations:"
echo "   ${YELLOW}supabase db push${NC}"
echo ""
echo "4. Start all services:"
echo "   ${YELLOW}npm run dev${NC}"
echo ""