#!/bin/bash
# Certik Audit - Verification Script
# Run this to verify everything works before submission

echo "========================================="
echo "CERTIK AUDIT - VERIFICATION SCRIPT"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd "$(dirname "$0")"

echo "Step 1: Check files exist..."
if [ -f "hardhat.config.cjs" ]; then
    echo -e "${GREEN}✓${NC} hardhat.config.cjs found"
else
    echo -e "${RED}✗${NC} hardhat.config.cjs missing"
    exit 1
fi

if [ -d "contracts" ]; then
    echo -e "${GREEN}✓${NC} contracts/ folder found"
else
    echo -e "${RED}✗${NC} contracts/ folder missing"
    exit 1
fi

if [ -d "test" ]; then
    echo -e "${GREEN}✓${NC} test/ folder found"
else
    echo -e "${RED}✗${NC} test/ folder missing"
    exit 1
fi

echo ""
echo "Step 2: Check node_modules..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules installed"
else
    echo -e "${YELLOW}!${NC} Installing dependencies..."
    npm install --legacy-peer-deps
fi

echo ""
echo "Step 3: Compile contracts..."
echo "Running: npx hardhat compile"
echo ""

if npx hardhat compile; then
    echo ""
    echo -e "${GREEN}✓✓✓ COMPILATION SUCCESS ✓✓✓${NC}"
else
    echo ""
    echo -e "${RED}✗✗✗ COMPILATION FAILED ✗✗✗${NC}"
    echo ""
    echo "Trying with explicit config path..."
    if npx hardhat --config hardhat.config.cjs compile; then
        echo -e "${GREEN}✓ Compilation worked with explicit config${NC}"
    else
        echo -e "${RED}✗ Compilation failed even with explicit config${NC}"
        exit 1
    fi
fi

echo ""
echo "Step 4: Run tests..."
echo "Running: npx hardhat test"
echo ""

if npx hardhat test; then
    echo ""
    echo -e "${GREEN}✓✓✓ ALL TESTS PASSED ✓✓✓${NC}"
else
    echo ""
    echo -e "${RED}✗✗✗ TESTS FAILED ✗✗✗${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}SUCCESS! Repository is ready for Certik!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Delete temp folder: rm -rf temp/"
echo "2. Commit changes: git add . && git commit -m 'Ready for Certik audit'"
echo "3. Push to GitHub: git push"
echo "4. Contact Certik with repo link"
echo ""
echo "⚠️  REMINDER: Tell Certik to read AUDIT_NOTES.md first!"
echo "    BSC USDC uses 18 decimals, not 6"
echo ""

