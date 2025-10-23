#!/bin/bash

# Koatty Monorepo - 同步到独立仓库脚本
# 使用 git subtree split 将子包同步到独立仓库

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
PACKAGES=(
  "koatty-config:koatty_config"
  "koatty-exception:koatty_exception"
  "koatty-trace:koatty_trace"
  "koatty-core:koatty_core"
  "koatty-router:koatty_router"
  "koatty-serve:koatty_serve"
  "koatty:koatty"
)

echo -e "${GREEN}开始同步到独立仓库...${NC}"

for pkg_info in "${PACKAGES[@]}"; do
  IFS=':' read -r pkg_dir pkg_name <<< "$pkg_info"
  
  echo -e "\n${YELLOW}处理: packages/$pkg_dir -> $pkg_name${NC}"
  
  # 检查目录是否存在
  if [ ! -d "packages/$pkg_dir" ]; then
    echo -e "${RED}错误: packages/$pkg_dir 不存在${NC}"
    continue
  fi
  
  # 使用 git subtree split 创建子树
  echo "创建 subtree branch..."
  BRANCH="sync/$pkg_name-$(date +%s)"
  git subtree split --prefix=packages/$pkg_dir -b "$BRANCH"
  
  echo -e "${GREEN}✓ 创建 branch: $BRANCH${NC}"
  
  # 注意: 实际推送到远程仓库需要配置 remote 和认证
  # git push <remote> $BRANCH:main --force
  
  # 清理临时分支
  git branch -D "$BRANCH" 2>/dev/null || true
done

echo -e "\n${GREEN}同步完成！${NC}"
echo "提示: 此脚本创建了 subtree 分支，实际推送需要配置 GitHub Token"

