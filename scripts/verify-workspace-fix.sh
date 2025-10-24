#!/bin/bash

# 验证所有包的 workspace:* 修复配置

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PACKAGES=(
    "koatty-router"
    "koatty"
    "koatty-core"
    "koatty-trace"
    "koatty-config"
    "koatty-exception"
    "koatty-serve"
)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}验证 workspace:* 修复配置${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

TOTAL=0
SUCCESS=0
FAILED=0

for pkg in "${PACKAGES[@]}"; do
    TOTAL=$((TOTAL + 1))
    PKG_DIR="packages/$pkg"
    
    echo -e "${YELLOW}检查 $pkg...${NC}"
    
    # 检查 1: fixWorkspaceDeps.js 是否存在
    if [ -f "$PKG_DIR/scripts/fixWorkspaceDeps.js" ]; then
        echo "  ✓ scripts/fixWorkspaceDeps.js 存在"
    else
        echo -e "  ${RED}✗ scripts/fixWorkspaceDeps.js 不存在${NC}"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # 检查 2: package.json 中是否有 build:fix
    if grep -q '"build:fix"' "$PKG_DIR/package.json"; then
        echo "  ✓ package.json 包含 build:fix 脚本"
    else
        echo -e "  ${RED}✗ package.json 缺少 build:fix 脚本${NC}"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # 检查 3: build 脚本是否调用 build:fix
    if grep -q 'build:fix' "$PKG_DIR/package.json" | grep -q '"build"'; then
        echo "  ✓ build 脚本调用 build:fix"
    else
        echo -e "  ${YELLOW}⚠ build 脚本可能没有调用 build:fix${NC}"
    fi
    
    SUCCESS=$((SUCCESS + 1))
    echo ""
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}验证结果${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "总计: $TOTAL 个包"
echo -e "${GREEN}成功: $SUCCESS${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}失败: $FAILED${NC}"
else
    echo -e "${GREEN}失败: 0${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ 所有包配置正确！${NC}"
    echo ""
    echo "现在 release-package.sh 会自动处理 workspace:* 依赖："
    echo "  1. npm run build 会触发 build:fix"
    echo "  2. build:fix 会自动转换 workspace:* 为实际版本"
    echo "  3. 发布前会验证 dist/package.json 中无 workspace:*"
else
    echo -e "${RED}❌ 有包配置不正确，请检查${NC}"
    exit 1
fi

