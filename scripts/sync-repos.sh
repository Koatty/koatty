#!/bin/bash
# Koatty Monorepo 代码同步脚本
# 从独立仓库同步最新代码到 monorepo

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================"
echo "  Koatty Monorepo Sync Script"
echo "======================================"
echo ""

# 临时目录
TEMP_DIR="/tmp/koatty-sync-$$"
mkdir -p "$TEMP_DIR"

# 要同步的仓库列表
declare -A REPOS=(
  ["koatty-core"]="https://github.com/koatty/koatty_core.git"
  ["koatty"]="https://github.com/thinkkoa/koatty.git"
  ["koatty-router"]="https://github.com/koatty/koatty_router.git"
  ["koatty-serve"]="https://github.com/koatty/koatty_serve.git"
  ["koatty-exception"]="https://github.com/koatty/koatty_exception.git"
  ["koatty-trace"]="https://github.com/koatty/koatty_trace.git"
)

# 要排除的文件/目录
EXCLUDE_PATTERNS=(
  "node_modules"
  "dist"
  "temp"
  ".git"
  "pnpm-lock.yaml"
  "package-lock.json"
  "yarn.lock"
)

sync_repo() {
  local package_name=$1
  local repo_url=$2
  local target_dir="packages/$package_name"
  
  echo -e "${BLUE}=== Syncing $package_name ===${NC}"
  echo "Repository: $repo_url"
  echo "Target: $target_dir"
  echo ""
  
  # 克隆仓库到临时目录
  echo -e "${YELLOW}Cloning repository...${NC}"
  cd "$TEMP_DIR"
  rm -rf "$package_name"
  
  if ! git clone --depth 1 "$repo_url" "$package_name" 2>&1; then
    echo -e "${RED}✗ Failed to clone $package_name${NC}"
    return 1
  fi
  
  # 备份 package.json 中的某些字段(workspace 配置)
  local original_pkg="/home/richen/workspace/nodejs/koatty-monorepo/$target_dir/package.json"
  local new_pkg="$TEMP_DIR/$package_name/package.json"
  
  # 同步代码(排除特定文件)
  echo -e "${YELLOW}Syncing source code...${NC}"
  cd "/home/richen/workspace/nodejs/koatty-monorepo/$target_dir"
  
  # 复制源代码目录
  if [ -d "$TEMP_DIR/$package_name/src" ]; then
    rm -rf src
    cp -r "$TEMP_DIR/$package_name/src" .
    echo "  ✓ Synced src/"
  fi
  
  # 复制测试目录
  if [ -d "$TEMP_DIR/$package_name/test" ]; then
    rm -rf test
    cp -r "$TEMP_DIR/$package_name/test" .
    echo "  ✓ Synced test/"
  fi
  
  # 复制配置文件
  for file in tsconfig.json api-extractor.json .rollup.config.js .eslintrc.js .eslintignore jest.config.js; do
    if [ -f "$TEMP_DIR/$package_name/$file" ]; then
      cp "$TEMP_DIR/$package_name/$file" .
      echo "  ✓ Synced $file"
    fi
  done
  
  # 复制 LICENSE 和 README (如果不存在)
  for file in LICENSE README.md; do
    if [ -f "$TEMP_DIR/$package_name/$file" ]; then
      cp "$TEMP_DIR/$package_name/$file" .
      echo "  ✓ Synced $file"
    fi
  done
  
  # 更新 package.json (保留 workspace 依赖)
  echo -e "${YELLOW}Updating package.json...${NC}"
  if [ -f "$new_pkg" ]; then
    # 使用 Node.js 合并 package.json
    node -e "
      const fs = require('fs');
      const original = JSON.parse(fs.readFileSync('$original_pkg', 'utf8'));
      const newPkg = JSON.parse(fs.readFileSync('$new_pkg', 'utf8'));
      
      // 保留 workspace:* 依赖
      const preserveWorkspaceDeps = (target, source) => {
        if (!source) return target;
        const result = { ...source };
        if (target) {
          Object.keys(target).forEach(key => {
            if (target[key] === 'workspace:*') {
              result[key] = 'workspace:*';
            }
          });
        }
        return result;
      };
      
      // 合并依赖,保留 workspace 依赖
      newPkg.dependencies = preserveWorkspaceDeps(original.dependencies, newPkg.dependencies);
      newPkg.devDependencies = preserveWorkspaceDeps(original.devDependencies, newPkg.devDependencies);
      newPkg.peerDependencies = preserveWorkspaceDeps(original.peerDependencies, newPkg.peerDependencies);
      
      // 保留 prepublishOnly 脚本的 monorepo 版本
      if (newPkg.scripts && newPkg.scripts.prepublishOnly) {
        if (original.scripts && original.scripts.prepublishOnly && 
            original.scripts.prepublishOnly.includes('Skipping prepublishOnly')) {
          newPkg.scripts.prepublishOnly = original.scripts.prepublishOnly;
        }
      }
      
      fs.writeFileSync('$original_pkg', JSON.stringify(newPkg, null, 2) + '\n');
    "
    echo "  ✓ Updated package.json"
  fi
  
  echo -e "${GREEN}✓ $package_name synced successfully${NC}"
  echo ""
}

# 清理函数
cleanup() {
  echo "Cleaning up temporary files..."
  rm -rf "$TEMP_DIR"
}

# 设置退出时清理
trap cleanup EXIT

# 同步所有仓库
for package in "${!REPOS[@]}"; do
  if ! sync_repo "$package" "${REPOS[$package]}"; then
    echo -e "${RED}Failed to sync $package, continuing...${NC}"
  fi
done

echo ""
echo -e "${GREEN}======================================"
echo -e "  ✓ Sync completed!"
echo -e "======================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review the changes: git status"
echo "2. Install dependencies: pnpm install"
echo "3. Build packages: ./scripts/build.sh"

