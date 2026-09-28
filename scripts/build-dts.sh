#!/bin/bash
# 构建类型声明文件，使用等待逻辑确保依赖包的类型声明文件存在

set -e  # 遇到错误立即退出

# 获取脚本所在目录（packages/koatty/scripts/）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 获取包目录（packages/koatty/）
PACKAGE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
# 获取工作区根目录
WORKSPACE_ROOT="$(cd "$PACKAGE_DIR/../.." && pwd)"

echo "🔨 Building type declarations for koatty..."

# 等待依赖包的类型声明文件
echo "⏳ Waiting for dependencies to be ready..."
# 如果等待失败，记录警告但继续构建（依赖可能在构建过程中生成）
if ! node "$WORKSPACE_ROOT/scripts/wait-for-deps.js"; then
  echo "⚠️  Some dependencies may not be ready, but continuing build..."
  echo "   (This is expected in parallel builds - dependencies will be available soon)"
fi

# 运行 tsc
# A committed/stale tsconfig.tsbuildinfo (composite projects cannot disable
# incremental) makes tsc skip emit entirely — it believes outputs are up to
# date — so temp/index.d.ts never materializes and api-extractor fails with
# "mainEntryPointFilePath does not exist". Drop the cache before compiling.
rm -f tsconfig.tsbuildinfo
echo "📝 Running TypeScript compiler..."
npx tsc --skipLibCheck

# 运行 api-extractor
echo "📦 Running API Extractor..."
npx api-extractor run --local --verbose || {
  echo "❌ API Extractor failed"
  exit 1
}

echo "✅ Type declarations built successfully"
