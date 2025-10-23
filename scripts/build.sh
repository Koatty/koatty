#!/bin/bash
# Koatty Monorepo 分阶段构建脚本
# 解决循环依赖问题的构建顺序管理

set -e  # 遇到错误立即退出

echo "======================================"
echo "  Koatty Monorepo Build Script"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 第一阶段:构建独立包(无依赖其他 koatty 包)
echo -e "${BLUE}=== Phase 1: Building independent packages ===${NC}"
echo ""

echo -e "${YELLOW}Building koatty_config...${NC}"
pnpm --filter koatty_config build
echo -e "${GREEN}✓ koatty_config built successfully${NC}"
echo ""

echo -e "${YELLOW}Building koatty_exception...${NC}"
pnpm --filter koatty_exception build
echo -e "${GREEN}✓ koatty_exception built successfully${NC}"
echo ""

# 第二阶段:构建相互依赖的核心包
echo -e "${BLUE}=== Phase 2: Building core packages (with circular deps) ===${NC}"
echo ""

# Strategy: Build JavaScript first (ignore type errors), then build types
echo -e "${YELLOW}Building koatty_core (JS only, first pass)...${NC}"
cd /home/richen/workspace/nodejs/koatty-monorepo/packages/koatty-core
pnpm run build:js || echo "Some errors expected, continuing..."
echo ""

echo -e "${YELLOW}Building koatty_trace (JS only, first pass)...${NC}"
cd /home/richen/workspace/nodejs/koatty-monorepo/packages/koatty-trace
pnpm run build:js || echo "Some errors expected, continuing..."
echo ""

# Now build types after JS is available
echo -e "${YELLOW}Building koatty_core (types)...${NC}"
cd /home/richen/workspace/nodejs/koatty-monorepo/packages/koatty-core
pnpm run build:dts && pnpm run build:doc && pnpm run build:cp
echo -e "${GREEN}✓ koatty_core built successfully${NC}"
echo ""

echo -e "${YELLOW}Building koatty_trace (types)...${NC}"
cd /home/richen/workspace/nodejs/koatty-monorepo/packages/koatty-trace
pnpm run build:dts && pnpm run build:doc && pnpm run build:cp
echo -e "${GREEN}✓ koatty_trace built successfully${NC}"
echo ""

# 第三阶段:构建其他依赖包
echo -e "${BLUE}=== Phase 3: Building remaining packages ===${NC}"
echo ""

echo -e "${YELLOW}Building koatty_router...${NC}"
pnpm --filter koatty_router build
echo -e "${GREEN}✓ koatty_router built successfully${NC}"
echo ""

echo -e "${YELLOW}Building koatty_serve...${NC}"
pnpm --filter koatty_serve build
echo -e "${GREEN}✓ koatty_serve built successfully${NC}"
echo ""

echo -e "${YELLOW}Building koatty (main framework)...${NC}"
pnpm --filter koatty build
echo -e "${GREEN}✓ koatty built successfully${NC}"
echo ""

# 完成
echo ""
echo -e "${GREEN}======================================"
echo -e "  ✓ Build completed successfully!"
echo -e "======================================${NC}"
echo ""
echo "All packages have been built in the correct order."
echo "The circular dependency between koatty_core and koatty_trace has been handled."

