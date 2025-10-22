# Koatty Monorepo 快速开始指南

> **目标**: 30分钟内完成 Monorepo 迁移并开始开发  
> **范围**: 只迁移核心框架包 (7个)，工具库保持独立 (4个)  
> **难度**: ⭐⭐ (简单)

---

## 📊 架构说明

### Monorepo 包 (7个) - 迁移

核心框架包，紧密耦合，需要频繁联合调试：

| 包名 | 说明 | 当前版本 |
|-----|------|---------|
| `koatty` | 主框架 | 3.13.2 |
| `koatty_core` | 核心功能 | 1.19.0-6 |
| `koatty_router` | 路由系统 | 1.20.0-8 |
| `koatty_serve` | 服务器 | 2.9.0-15 |
| `koatty_exception` | 异常处理 | 1.8.0 |
| `koatty_trace` | 追踪系统 | 1.16.0 |
| `koatty_config` | 配置管理 | 1.2.2 |

### 独立包 (4个) - 保持独立

通用工具库，可被其他项目使用，变更频率低：

| 包名 | 说明 | 当前版本 | 原因 |
|-----|------|---------|------|
| `koatty_container` | IOC容器 | 1.17.0 | 通用，可独立使用 |
| `koatty_lib` | 工具函数库 | 1.4.3 | 通用，无框架依赖 |
| `koatty_loader` | 加载器 | 1.3.0 | 通用功能 |
| `koatty_logger` | 日志系统 | 2.5.0 | 通用，可独立使用 |

### 依赖关系

```
Monorepo (workspace:*):
  koatty
    ├─ koatty_core
    ├─ koatty_router
    ├─ koatty_serve
    ├─ koatty_exception
    ├─ koatty_trace
    └─ koatty_config

独立包 (npm):
  koatty_container ─→ koatty_lib ─→ koatty_logger
  koatty_loader
```

---

## 🚀 快速开始 (3步)

### Step 1: 创建 Monorepo 结构 (5分钟)

```bash
# 1. 创建目录
mkdir koatty-monorepo && cd koatty-monorepo

# 2. 初始化
pnpm init

# 3. 安装工具
pnpm add -D turbo @changesets/cli

# 4. 创建配置
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
  - 'apps/*'
EOF

cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
EOF

cat > .npmrc << 'EOF'
auto-install-peers=true
link-workspace-packages=true
EOF

# 5. 创建目录
mkdir -p packages apps tools
```

---

### Step 2: 迁移核心包 (15分钟)

#### 自动化脚本

创建 `migrate.sh`:

```bash
#!/bin/bash

# Koatty Monorepo 自动迁移脚本
# 用途: 将核心框架包迁移到 monorepo
# 说明: 工具库 (container, lib, loader, logger) 保持独立

set -e

echo "🚀 开始迁移 Koatty 核心框架包到 Monorepo..."
echo ""
echo "📦 迁移范围:"
echo "  ✅ 核心框架包 (7个) - 迁移到 monorepo"
echo "  📦 工具库 (4个) - 保持独立，从 npm 安装"
echo ""

# 定义核心框架包映射: 原名称:新名称
declare -A packages=(
  ["koatty_core"]="koatty-core"
  ["koatty_router"]="koatty-router"
  ["koatty_serve"]="koatty-serve"
  ["koatty_exception"]="koatty-exception"
  ["koatty_trace"]="koatty-trace"
  ["koatty_config"]="koatty-config"
  ["koatty"]="koatty"
)

# 独立工具库（不迁移）
declare -a independent_packages=(
  "koatty_container"
  "koatty_lib"
  "koatty_loader"
  "koatty_logger"
)

# GitHub 组织
ORG="koatty"
BASE_URL="https://github.com/${ORG}"

# 迁移核心框架包
for old_name in "${!packages[@]}"; do
  new_name="${packages[$old_name]}"
  target_dir="packages/${new_name}"
  
  echo ""
  echo "📦 迁移: $old_name → $new_name"
  
  # 检查是否已存在
  if [ -d "$target_dir" ]; then
    echo "⚠️  $target_dir 已存在，跳过"
    continue
  fi
  
  # 克隆仓库
  repo_url="${BASE_URL}/${old_name}"
  
  echo "  📥 克隆 $repo_url..."
  git clone "$repo_url" "temp_${new_name}" 2>/dev/null || {
    echo "  ❌ 克隆失败，跳过"
    continue
  }
  
  # 移动到 packages
  mv "temp_${new_name}" "$target_dir"
  
  # 清理 git (保留历史可注释此行)
  rm -rf "${target_dir}/.git"
  
  echo "  ✅ 完成"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 核心框架包迁移完成！"
echo ""
echo "📦 独立工具库 (保持独立，从 npm 安装):"
for pkg in "${independent_packages[@]}"; do
  echo "  - $pkg"
done
echo ""
echo "下一步:"
echo "  1. 运行: pnpm install"
echo "  2. 运行: node update-deps.js  (更新 workspace 依赖)"
echo "  3. 运行: pnpm build"
echo "  4. 运行: pnpm test"
```

#### 执行迁移

```bash
# 1. 赋予执行权限
chmod +x migrate.sh

# 2. 执行迁移
./migrate.sh

# 3. 更新依赖关系 (见下一步)
```

---

### Step 3: 更新依赖并验证 (10分钟)

#### 3.1 批量更新 workspace 依赖

创建 `update-deps.js`:

```javascript
#!/usr/bin/env node

/**
 * 自动更新 package.json 中的 workspace 依赖
 * 说明: 只有 monorepo 内的核心包使用 workspace:*
 *       独立工具库保持 npm 版本号
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// 🎯 Monorepo 核心框架包（使用 workspace:*）
const monorepoPackages = [
  'koatty',
  'koatty_core',
  'koatty_router',
  'koatty_serve',
  'koatty_exception',
  'koatty_trace',
  'koatty_config'
];

// 📦 独立工具库（保持 npm 版本）
const independentPackages = [
  'koatty_container',
  'koatty_lib',
  'koatty_loader',
  'koatty_logger'
];

async function updateWorkspaceDeps() {
  // 找到所有 package.json
  const pkgFiles = await glob('packages/*/package.json');
  
  console.log('🔍 扫描包依赖...\n');
  
  for (const pkgFile of pkgFiles) {
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
    let modified = false;
    
    console.log(`📦 处理: ${pkg.name}`);
    
    // 更新 dependencies 和 devDependencies
    ['dependencies', 'devDependencies'].forEach(depType => {
      if (!pkg[depType]) return;
      
      Object.keys(pkg[depType]).forEach(depName => {
        // Monorepo 包使用 workspace:*
        if (monorepoPackages.includes(depName)) {
          pkg[depType][depName] = 'workspace:*';
          modified = true;
          console.log(`  ✨ ${depName} -> workspace:*`);
        }
        // 独立包保持 npm 版本
        else if (independentPackages.includes(depName)) {
          console.log(`  📦 ${depName} 保持独立版本`);
        }
      });
    });
    
    // 保存
    if (modified) {
      fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
      console.log(`  ✅ 已更新\n`);
    } else {
      console.log(`  ⏭️  无需更新\n`);
    }
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 依赖更新完成！\n');
  console.log('说明:');
  console.log('  ✨ workspace:* = Monorepo 内的核心框架包');
  console.log('  📦 独立版本 = 从 npm 安装的工具库');
}

updateWorkspaceDeps().catch(console.error);
```

#### 3.2 执行更新

```bash
# 1. 安装 glob (如果需要)
npm install -g glob

# 2. 更新依赖
node update-deps.js

# 3. 安装依赖
pnpm install

# 4. 构建所有包
pnpm build

# 5. 运行测试
pnpm test
```

---

## ✨ 完成！开始开发

### 常用命令

```bash
# 构建所有包
pnpm build

# 监听模式 (自动重新构建)
pnpm dev

# 测试
pnpm test

# Lint
pnpm lint

# 只构建特定包
pnpm --filter koatty_core build

# 为特定包添加依赖
pnpm --filter koatty_core add lodash

# 清理构建产物
pnpm clean
```

### 调试工作流

```bash
# 场景: 修改 koatty_core 并在 koatty 中测试

# Terminal 1: 启动 koatty_core watch
cd packages/koatty-core
pnpm dev

# Terminal 2: 启动 koatty demo
cd apps/demo
pnpm dev

# ✅ 修改 koatty_core，koatty 自动重载！
# ✅ 无需 npm link！
```

---

## 📚 更多资源

- **详细方案**: [MONOREPO_MIGRATION_PLAN.md](./MONOREPO_MIGRATION_PLAN.md)
- **Turborepo 文档**: https://turbo.build/repo/docs
- **pnpm 文档**: https://pnpm.io/workspaces

---

## 🆘 遇到问题？

### 问题 1: pnpm 找不到命令

```bash
# 安装 pnpm
npm install -g pnpm@8
```

### 问题 2: workspace 依赖没生效

```bash
# 清理并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 问题 3: 构建失败

```bash
# 按依赖顺序构建
pnpm --filter koatty_container build
pnpm --filter koatty_core build
pnpm --filter koatty_router build
# ...
```

---

**创建日期**: 2025-10-22  
**预计耗时**: 30分钟

