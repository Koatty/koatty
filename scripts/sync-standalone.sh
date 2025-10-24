#!/bin/bash

# Koatty Monorepo - 同步到独立仓库脚本
# 用法: ./scripts/sync-standalone.sh <package-name> [remote-url]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 包名映射（monorepo中的目录名 -> 独立仓库URL）
# 提示: 可以使用 SSH 或 HTTPS
# SSH: git@github.com:koatty/koatty_router.git (需要配置 SSH 密钥)
# HTTPS: https://github.com/koatty/koatty_router.git (需要输入凭据)
declare -A PACKAGE_REPOS=(
    ["koatty-router"]="https://github.com/koatty/koatty_router.git"
    ["koatty-core"]="https://github.com/koatty/koatty_core.git"
    ["koatty-container"]="https://github.com/koatty/koatty_container.git"
    ["koatty-validation"]="https://github.com/koatty/koatty_validation.git"
)

# 帮助信息
function show_help() {
    echo -e "${BLUE}用法:${NC}"
    echo "  ./scripts/sync-standalone.sh <package-name> [remote-url]"
    echo ""
    echo -e "${BLUE}示例:${NC}"
    echo "  ./scripts/sync-standalone.sh koatty-router"
    echo "  ./scripts/sync-standalone.sh koatty-router git@github.com:koatty/koatty_router.git"
    echo ""
    echo -e "${BLUE}支持的包:${NC}"
    for package in "${!PACKAGE_REPOS[@]}"; do
        echo "  - $package"
    done
    echo ""
}

# 参数检查
if [ -z "$1" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

PACKAGE_NAME=$1
PACKAGE_DIR="packages/$PACKAGE_NAME"
REMOTE_NAME="${PACKAGE_NAME}-standalone"

# 获取远程仓库 URL
if [ -n "$2" ]; then
    REMOTE_URL=$2
elif [ -n "${PACKAGE_REPOS[$PACKAGE_NAME]}" ]; then
    REMOTE_URL=${PACKAGE_REPOS[$PACKAGE_NAME]}
else
    echo -e "${RED}错误: 未知的包名 '$PACKAGE_NAME'${NC}"
    echo "请提供远程仓库 URL 或使用支持的包名"
    show_help
    exit 1
fi

# 检查包目录是否存在
if [ ! -d "$PACKAGE_DIR" ]; then
    echo -e "${RED}错误: 包目录 $PACKAGE_DIR 不存在${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}同步 $PACKAGE_NAME 到独立仓库${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}包目录:${NC} $PACKAGE_DIR"
echo -e "${YELLOW}远程仓库:${NC} $REMOTE_URL"
echo ""

# 检查是否有未提交的变更
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}警告: 检测到未提交的变更${NC}"
    echo ""
    git status --short
    echo ""
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 添加或更新 remote
if git remote | grep -q "^${REMOTE_NAME}$"; then
    echo -e "${GREEN}✓${NC} Remote '${REMOTE_NAME}' 已存在"
    echo "  更新 remote URL..."
    git remote set-url "$REMOTE_NAME" "$REMOTE_URL"
else
    echo -e "${YELLOW}+${NC} 添加 remote '${REMOTE_NAME}'..."
    git remote add "$REMOTE_NAME" "$REMOTE_URL"
fi

echo ""
echo -e "${BLUE}开始同步...${NC}"
echo ""

# 使用 subtree push
echo "1. 推送代码到独立仓库..."
if git subtree push --prefix="$PACKAGE_DIR" "$REMOTE_NAME" master; then
    echo -e "${GREEN}✓${NC} 代码推送成功"
else
    echo -e "${YELLOW}⚠${NC}  subtree push 失败，尝试使用 split + push..."
    
    # 使用 split 方式
    TEMP_BRANCH="${PACKAGE_NAME}-sync-temp"
    
    echo "  创建临时分支..."
    git subtree split --prefix="$PACKAGE_DIR" -b "$TEMP_BRANCH"
    
    echo "  推送到远程..."
    if git push "$REMOTE_NAME" "$TEMP_BRANCH:master" --force; then
        echo -e "${GREEN}✓${NC} 代码推送成功（使用 force push）"
    else
        echo -e "${RED}✗${NC} 推送失败"
        git branch -D "$TEMP_BRANCH" 2>/dev/null || true
        exit 1
    fi
    
    echo "  清理临时分支..."
    git branch -D "$TEMP_BRANCH"
fi

echo ""
echo "2. 同步 tags..."

# 获取与该包相关的 tags
PACKAGE_TAGS=$(git tag | grep "^${PACKAGE_NAME}@" || true)

if [ -n "$PACKAGE_TAGS" ]; then
    echo "  找到 ${PACKAGE_NAME} 的 tags:"
    echo "$PACKAGE_TAGS" | sed 's/^/    - /'
    
    # 推送 tags
    if git push "$REMOTE_NAME" --tags --force; then
        echo -e "${GREEN}✓${NC} Tags 同步成功"
    else
        echo -e "${YELLOW}⚠${NC}  Tags 同步失败（可能需要手动处理）"
    fi
else
    echo -e "${YELLOW}⚠${NC}  未找到相关 tags"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 同步完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}独立仓库地址:${NC}"
echo "  $REMOTE_URL"
echo ""
echo -e "${BLUE}验证同步结果:${NC}"
echo "  git ls-remote $REMOTE_NAME"
echo ""

