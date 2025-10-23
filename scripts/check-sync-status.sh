#!/bin/bash

# Koatty Monorepo - 检查同步状态脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Koatty Monorepo 同步状态检查 ===${NC}\n"

# 检查包列表
PACKAGES=(
  "koatty-config"
  "koatty-exception"
  "koatty-trace"
  "koatty-core"
  "koatty-router"
  "koatty-serve"
  "koatty"
)

echo -e "${YELLOW}检查本地包状态...${NC}\n"

for pkg in "${PACKAGES[@]}"; do
  pkg_path="packages/$pkg"
  
  if [ -d "$pkg_path" ]; then
    version=$(cat "$pkg_path/package.json" | grep '"version"' | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    name=$(cat "$pkg_path/package.json" | grep '"name"' | head -1 | sed 's/.*"name": "\(.*\)".*/\1/')
    echo -e "${GREEN}✓${NC} $name@$version"
  else
    echo -e "${RED}✗${NC} $pkg (目录不存在)"
  fi
done

echo -e "\n${YELLOW}Git 状态:${NC}"
git status --short

echo -e "\n${YELLOW}最近提交:${NC}"
git log --oneline -5

echo -e "\n${GREEN}检查完成${NC}"

