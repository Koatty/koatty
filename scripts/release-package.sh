#!/bin/bash

# Koatty Monorepo - 发布单个包到 npm
# 用法: ./scripts/release-package.sh <package-name> [--dry-run]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PACKAGE_NAME=$1
DRY_RUN=false

if [ "$2" = "--dry-run" ]; then
    DRY_RUN=true
fi

# 帮助信息
function show_help() {
    echo -e "${BLUE}用法:${NC}"
    echo "  ./scripts/release-package.sh <package-name> [--dry-run]"
    echo ""
    echo -e "${BLUE}示例:${NC}"
    echo "  ./scripts/release-package.sh koatty-router"
    echo "  ./scripts/release-package.sh koatty-router --dry-run"
    echo ""
    echo -e "${BLUE}选项:${NC}"
    echo "  --dry-run    模拟发布流程，不实际发布到 npm"
    echo ""
}

if [ -z "$1" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

PACKAGE_DIR="packages/$PACKAGE_NAME"

if [ ! -d "$PACKAGE_DIR" ]; then
    echo -e "${RED}错误: 包目录 $PACKAGE_DIR 不存在${NC}"
    exit 1
fi

cd "$PACKAGE_DIR"

# 读取 package.json 信息
PACKAGE_JSON_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}发布包到 npm${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}包名:${NC} $PACKAGE_JSON_NAME"
echo -e "${YELLOW}版本:${NC} $PACKAGE_VERSION"
echo -e "${YELLOW}目录:${NC} $PACKAGE_DIR"
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}模式:${NC} DRY RUN（不会实际发布）"
fi
echo ""

# 检查是否登录 npm
if ! npm whoami &> /dev/null; then
    echo -e "${RED}错误: 未登录 npm${NC}"
    echo "请先运行: npm login"
    exit 1
fi

NPM_USER=$(npm whoami)
echo -e "${GREEN}✓${NC} npm 用户: $NPM_USER"
echo ""

# 检查版本是否已发布
NPM_VERSION=$(npm view "$PACKAGE_JSON_NAME" version 2>/dev/null || echo "")
if [ "$NPM_VERSION" = "$PACKAGE_VERSION" ]; then
    echo -e "${YELLOW}警告: 版本 $PACKAGE_VERSION 已在 npm 上发布${NC}"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 步骤1: 运行测试
echo -e "${BLUE}步骤 1/4: 运行测试...${NC}"
if CI=true npm test; then
    echo -e "${GREEN}✓${NC} 测试通过"
else
    echo -e "${RED}✗${NC} 测试失败"
    exit 1
fi
echo ""

# 步骤2: 构建
echo -e "${BLUE}步骤 2/4: 构建包...${NC}"
if npm run build; then
    echo -e "${GREEN}✓${NC} 构建成功"
else
    echo -e "${RED}✗${NC} 构建失败"
    exit 1
fi
echo ""

# 检查 dist 目录
if [ ! -d "dist" ]; then
    echo -e "${RED}错误: dist 目录不存在${NC}"
    exit 1
fi

# 检查 workspace:* 依赖
echo -e "${BLUE}步骤 2.5/4: 验证 workspace:* 依赖...${NC}"
if grep -q "workspace:\*" dist/package.json 2>/dev/null; then
    echo -e "${RED}✗ 错误: dist/package.json 仍包含 workspace:* 依赖${NC}"
    echo -e "${YELLOW}提示: 请确保 build:fix 步骤在构建脚本中${NC}"
    echo ""
    echo "发现的 workspace:* 依赖:"
    grep "workspace:\*" dist/package.json
    echo ""
    exit 1
fi
echo -e "${GREEN}✓${NC} 无 workspace:* 依赖"
echo ""

echo -e "${YELLOW}构建产物:${NC}"
ls -lh dist/ | grep -v "^total" | awk '{print "  " $9 " (" $5 ")"}'
echo ""

# 步骤3: 发布到 npm
echo -e "${BLUE}步骤 3/4: 发布到 npm...${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN]${NC} 模拟发布命令:"
    echo "  npm publish --dry-run"
    npm publish --dry-run
    echo -e "${GREEN}✓${NC} Dry run 完成"
else
    read -p "确认发布 $PACKAGE_JSON_NAME@$PACKAGE_VERSION 到 npm? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "发布已取消"
        exit 1
    fi
    
    if npm publish --ignore-scripts; then
        echo -e "${GREEN}✓${NC} 发布成功"
    else
        echo -e "${RED}✗${NC} 发布失败"
        exit 1
    fi
fi
echo ""

# 步骤4: 创建 git tag
if [ "$DRY_RUN" = false ]; then
    echo -e "${BLUE}步骤 4/4: 创建 git tag...${NC}"
    
    cd ../..  # 回到根目录
    
    TAG_NAME="${PACKAGE_NAME}@${PACKAGE_VERSION}"
    
    if git tag -l | grep -q "^${TAG_NAME}$"; then
        echo -e "${YELLOW}⚠${NC}  Tag $TAG_NAME 已存在"
    else
        # 创建带注释的 tag
        git tag -a "$TAG_NAME" -m "Release $PACKAGE_JSON_NAME@$PACKAGE_VERSION"
        echo -e "${GREEN}✓${NC} 创建 tag: $TAG_NAME"
    fi
else
    echo -e "${BLUE}步骤 4/4: 创建 git tag...${NC}"
    echo -e "${YELLOW}[DRY RUN]${NC} 跳过创建 tag"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}✓ Dry run 完成!${NC}"
else
    echo -e "${GREEN}✓ 发布完成!${NC}"
fi
echo -e "${GREEN}========================================${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
    echo -e "${BLUE}下一步操作:${NC}"
    echo ""
    echo "1. 验证发布:"
    echo "   npm view $PACKAGE_JSON_NAME"
    echo ""
    echo "2. 同步到独立仓库:"
    echo "   ./scripts/sync-standalone.sh $PACKAGE_NAME"
    echo ""
    echo "3. 在 GitHub 创建 Release:"
    echo "   https://github.com/koatty/${PACKAGE_NAME//-/_}/releases/new"
    echo ""
fi

