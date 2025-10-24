#!/bin/bash

# 将 fixWorkspaceDeps.js 复制到所有需要的包

set -e

PACKAGES=(
    "koatty"
    "koatty-trace"
    "koatty-core"
    "koatty-config"
    "koatty-exception"
    "koatty-serve"
)

echo "📦 复制 fixWorkspaceDeps.js 到所有包..."
echo ""

for pkg in "${PACKAGES[@]}"; do
    PKG_DIR="packages/$pkg"
    SCRIPTS_DIR="$PKG_DIR/scripts"
    
    if [ ! -d "$PKG_DIR" ]; then
        echo "⚠️  跳过 $pkg (目录不存在)"
        continue
    fi
    
    # 创建 scripts 目录（如果不存在）
    mkdir -p "$SCRIPTS_DIR"
    
    # 复制脚本
    cp packages/koatty-router/scripts/fixWorkspaceDeps.js "$SCRIPTS_DIR/"
    
    echo "✓ $pkg"
done

echo ""
echo "✅ 完成！现在需要更新每个包的 package.json，添加 build:fix 步骤"

