# Koatty Monorepo 双向同步策略

> **目标**: 在 Monorepo 中开发，自动同步到原独立仓库，保持兼容性  
> **方案**: Git Subtree Split + GitHub Actions 自动化  
> **难度**: ⭐⭐⭐ (中等)

---

## 📋 目录

1. [方案概述](#1-方案概述)
2. [技术方案](#2-技术方案)
3. [实施步骤](#3-实施步骤)
4. [自动化配置](#4-自动化配置)
5. [工作流程](#5-工作流程)
6. [最佳实践](#6-最佳实践)

---

## 1. 方案概述

### 1.1 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                  Monorepo (主开发仓库)                    │
│                koatty/koatty-monorepo                     │
├─────────────────────────────────────────────────────────┤
│  packages/                                               │
│  ├── koatty/           ←→  koatty/koatty                │
│  ├── koatty-core/      ←→  koatty/koatty_core           │
│  ├── koatty-router/    ←→  koatty/koatty_router         │
│  ├── koatty-serve/     ←→  koatty/koatty_serve          │
│  ├── koatty-exception/ ←→  koatty/koatty_exception      │
│  ├── koatty-trace/     ←→  koatty/koatty_trace          │
│  └── koatty-config/    ←→  koatty/koatty_config         │
└─────────────────────────────────────────────────────────┘
            ↓ 自动同步 (git subtree split)
┌─────────────────────────────────────────────────────────┐
│              独立仓库 (向后兼容，社区可见)                 │
│         koatty/koatty_core, koatty_router, etc.         │
└─────────────────────────────────────────────────────────┘
```

### 1.2 核心特性

| 特性 | 说明 | 优势 |
|-----|------|------|
| **主仓库** | Monorepo 是唯一真相源 | 统一开发，减少冲突 |
| **自动同步** | GitHub Actions 自动推送 | 无需手动操作 |
| **向后兼容** | 独立仓库保持可用 | 用户无感知 |
| **双向贡献** | 接受独立仓库的 PR | 社区友好 |
| **历史保留** | 保留独立仓库的 git 历史 | 不丢失历史记录 |

---

## 2. 技术方案

### 2.1 方案对比

#### 方案 A: Git Subtree Split (✅ 推荐)

```bash
# 原理：从 monorepo 子目录提取历史，推送到独立仓库
git subtree split --prefix=packages/koatty-core -b koatty-core-split
git push git@github.com:koatty/koatty_core.git koatty-core-split:main
```

**优点**:
- ✅ Monorepo 是唯一真相源
- ✅ 保留完整的 git 历史
- ✅ 独立仓库只是镜像，自动更新
- ✅ 支持自动化

**缺点**:
- ⚠️ 需要配置 CI/CD
- ⚠️ 首次设置复杂

**适用场景**: ⭐⭐⭐⭐⭐ 最适合你的需求

---

#### 方案 B: Git Submodule (❌ 不推荐)

```bash
# 原理：独立仓库作为 submodule
git submodule add https://github.com/koatty/koatty_core packages/koatty-core
```

**优点**:
- ✅ 双向同步简单
- ✅ 独立仓库保持独立

**缺点**:
- ❌ 失去 monorepo 优势
- ❌ 开发体验差（需要 submodule update）
- ❌ 版本管理复杂

**适用场景**: ⭐ 不适合

---

#### 方案 C: 独立 + Monorepo Overlay (❌ 复杂)

```bash
# 原理：保留两套代码，通过脚本同步
rsync -av packages/koatty-core/ ../koatty_core/
```

**优点**:
- ✅ 完全独立

**缺点**:
- ❌ 需要手动同步
- ❌ 容易出错
- ❌ 维护成本高

**适用场景**: ⭐ 不适合

---

### 2.2 推荐方案详解：Git Subtree Split

#### 工作原理

```
1. 开发者在 Monorepo 提交代码
   └─> packages/koatty-core/src/index.ts

2. GitHub Actions 检测到变更
   └─> 触发 sync workflow

3. Git Subtree Split 提取子目录
   └─> 从 packages/koatty-core 创建独立分支

4. 推送到独立仓库
   └─> git push koatty/koatty_core

5. 独立仓库自动更新
   └─> 用户 npm install koatty_core 获得最新版
```

#### 关键技术

**1. Git Subtree Split**

```bash
# 将 monorepo 子目录拆分为独立分支
git subtree split \
  --prefix=packages/koatty-core \
  --branch=split-koatty-core

# 推送到独立仓库
git push \
  git@github.com:koatty/koatty_core.git \
  split-koatty-core:main \
  --force
```

**2. GitHub Actions 自动化**

```yaml
# 在 monorepo push 时自动触发
on:
  push:
    branches: [main]
    paths:
      - 'packages/koatty-core/**'
```

**3. 保留独立仓库特性**

```
独立仓库保留：
├── .github/workflows/     # 独立的 CI
├── README.md             # 独立的文档
├── LICENSE               # 独立的许可证
└── package.json          # 独立的版本号
```

---

## 3. 实施步骤

### 3.1 准备阶段

#### Step 1: 备份独立仓库

```bash
# 为每个独立仓库创建备份分支
repos=(
  "koatty_core"
  "koatty_router"
  "koatty_serve"
  "koatty_exception"
  "koatty_trace"
  "koatty_config"
  "koatty"
)

for repo in "${repos[@]}"; do
  cd "$repo"
  git checkout -b backup-$(date +%Y%m%d)
  git push origin backup-$(date +%Y%m%d)
  cd ..
done
```

#### Step 2: 配置 Monorepo Remote

```bash
cd koatty-monorepo

# 为每个包添加独立仓库作为 remote
git remote add koatty-core git@github.com:koatty/koatty_core.git
git remote add koatty-router git@github.com:koatty/koatty_router.git
git remote add koatty-serve git@github.com:koatty/koatty_serve.git
git remote add koatty-exception git@github.com:koatty/koatty_exception.git
git remote add koatty-trace git@github.com:koatty/koatty_trace.git
git remote add koatty-config git@github.com:koatty/koatty_config.git
git remote add koatty-main git@github.com:koatty/koatty.git

# 查看 remote
git remote -v
```

---

### 3.2 首次同步

#### 创建同步脚本

创建 `scripts/sync-to-repos.sh`:

```bash
#!/bin/bash

# Monorepo 到独立仓库同步脚本
# 用途：将 packages/ 下的包同步到独立仓库

set -e

# 包映射：monorepo目录:独立仓库名:remote名
declare -A packages=(
  ["koatty"]="koatty:koatty-main"
  ["koatty-core"]="koatty_core:koatty-core"
  ["koatty-router"]="koatty_router:koatty-router"
  ["koatty-serve"]="koatty_serve:koatty-serve"
  ["koatty-exception"]="koatty_exception:koatty-exception"
  ["koatty-trace"]="koatty_trace:koatty-trace"
  ["koatty-config"]="koatty_config:koatty-config"
)

echo "🚀 开始同步 Monorepo 到独立仓库..."
echo ""

for pkg_dir in "${!packages[@]}"; do
  IFS=: read -r repo_name remote_name <<< "${packages[$pkg_dir]}"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 同步: packages/$pkg_dir → $repo_name"
  echo ""
  
  # 检查目录是否存在
  if [ ! -d "packages/$pkg_dir" ]; then
    echo "❌ 目录不存在: packages/$pkg_dir"
    continue
  fi
  
  # 创建临时分支
  branch_name="sync-$pkg_dir-$(date +%s)"
  
  echo "  1️⃣  创建临时分支: $branch_name"
  git subtree split --prefix="packages/$pkg_dir" -b "$branch_name"
  
  echo "  2️⃣  推送到独立仓库: $remote_name"
  git push "$remote_name" "$branch_name:main" --force
  
  echo "  3️⃣  清理临时分支"
  git branch -D "$branch_name"
  
  echo "  ✅ 同步完成: $repo_name"
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 所有包同步完成！"
```

#### 执行首次同步

```bash
# 1. 赋予执行权限
chmod +x scripts/sync-to-repos.sh

# 2. 执行同步
./scripts/sync-to-repos.sh

# 3. 验证独立仓库
for repo in koatty_core koatty_router koatty_serve; do
  echo "Checking $repo..."
  cd "../$repo"
  git pull
  git log --oneline -5
  cd ../koatty-monorepo
done
```

---

### 3.3 配置自动化

#### GitHub Actions Workflow

创建 `.github/workflows/sync-to-independent-repos.yml`:

```yaml
name: Sync to Independent Repos

on:
  push:
    branches:
      - main
    paths:
      - 'packages/**'
  workflow_dispatch: # 支持手动触发

jobs:
  sync:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        package:
          - name: koatty
            dir: packages/koatty
            repo: koatty/koatty
          - name: koatty_core
            dir: packages/koatty-core
            repo: koatty/koatty_core
          - name: koatty_router
            dir: packages/koatty-router
            repo: koatty/koatty_router
          - name: koatty_serve
            dir: packages/koatty-serve
            repo: koatty/koatty_serve
          - name: koatty_exception
            dir: packages/koatty-exception
            repo: koatty/koatty_exception
          - name: koatty_trace
            dir: packages/koatty-trace
            repo: koatty/koatty_trace
          - name: koatty_config
            dir: packages/koatty-config
            repo: koatty/koatty_config
    
    steps:
      - name: Checkout monorepo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # 获取完整历史
      
      - name: Setup Git
        run: |
          git config --global user.name "Koatty Bot"
          git config --global user.email "bot@koatty.org"
      
      - name: Check if package changed
        id: check
        run: |
          # 检查包是否有变更
          if git diff --name-only HEAD~1 HEAD | grep -q "^${{ matrix.package.dir }}/"; then
            echo "changed=true" >> $GITHUB_OUTPUT
            echo "📦 Package ${{ matrix.package.name }} has changes"
          else
            echo "changed=false" >> $GITHUB_OUTPUT
            echo "⏭️  Package ${{ matrix.package.name }} has no changes"
          fi
      
      - name: Sync to independent repo
        if: steps.check.outputs.changed == 'true'
        env:
          GITHUB_TOKEN: ${{ secrets.SYNC_TOKEN }}
        run: |
          echo "🚀 Syncing ${{ matrix.package.name }} to independent repo..."
          
          # 创建临时分支
          BRANCH="sync-$(date +%s)"
          git subtree split --prefix="${{ matrix.package.dir }}" -b "$BRANCH"
          
          # 推送到独立仓库
          git remote add target "https://x-access-token:${GITHUB_TOKEN}@github.com/${{ matrix.package.repo }}.git"
          git push target "$BRANCH:main" --force
          
          # 清理
          git branch -D "$BRANCH"
          
          echo "✅ Sync completed for ${{ matrix.package.name }}"
      
      - name: Notify success
        if: steps.check.outputs.changed == 'true'
        run: |
          echo "✅ ${{ matrix.package.name }} synced successfully to ${{ matrix.package.repo }}"
```

#### 配置 GitHub Token

```bash
# 1. 创建 Personal Access Token
# - 去 GitHub Settings > Developer settings > Personal access tokens
# - 创建新 token，勾选 repo 权限
# - 复制 token

# 2. 添加到 Monorepo Secrets
# - 去 koatty-monorepo Settings > Secrets and variables > Actions
# - 添加 secret: SYNC_TOKEN = <你的token>
```

---

## 4. 自动化配置

### 4.1 独立仓库保护

#### 保留独立仓库的特性

每个独立仓库需要保留自己的：

**1. README.md**

```bash
# 在 monorepo 的 packages/koatty-core/ 中创建
cat > packages/koatty-core/README.md << 'EOF'
# koatty_core

> ⚠️ **注意**: 此仓库从 [koatty-monorepo](https://github.com/koatty/koatty-monorepo) 自动同步

Koatty framework core.

## Installation

```bash
npm install koatty_core
```

## Usage

See [Documentation](https://koatty.org)

## Development

开发请前往主仓库：
- **Monorepo**: https://github.com/koatty/koatty-monorepo
- **文档**: https://github.com/koatty/koatty-monorepo/tree/main/packages/koatty-core

## Issues

请在主仓库提交 Issues：
https://github.com/koatty/koatty-monorepo/issues

## License

BSD-3-Clause
EOF
```

**2. .github/workflows/ci.yml**

```yaml
# packages/koatty-core/.github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
```

**3. package.json 元数据**

```json
{
  "name": "koatty_core",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/koatty/koatty_core.git",
    "directory": "."
  },
  "bugs": {
    "url": "https://github.com/koatty/koatty-monorepo/issues"
  },
  "homepage": "https://github.com/koatty/koatty-monorepo/tree/main/packages/koatty-core"
}
```

---

### 4.2 双向同步配置

#### 接收独立仓库的 PR

创建 `.github/workflows/sync-from-independent-repos.yml`:

```yaml
name: Sync FROM Independent Repos

on:
  repository_dispatch:
    types: [sync-from-independent]
  workflow_dispatch:
    inputs:
      repo_name:
        description: 'Independent repo name'
        required: true
        type: choice
        options:
          - koatty_core
          - koatty_router
          - koatty_serve
          - koatty_exception
          - koatty_trace
          - koatty_config

jobs:
  sync-back:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout monorepo
        uses: actions/checkout@v4
      
      - name: Determine package info
        id: info
        run: |
          case "${{ github.event.inputs.repo_name || github.event.client_payload.repo }}" in
            koatty_core)
              echo "dir=packages/koatty-core" >> $GITHUB_OUTPUT
              echo "repo=koatty/koatty_core" >> $GITHUB_OUTPUT
              ;;
            koatty_router)
              echo "dir=packages/koatty-router" >> $GITHUB_OUTPUT
              echo "repo=koatty/koatty_router" >> $GITHUB_OUTPUT
              ;;
            koatty_serve)
              echo "dir=packages/koatty-serve" >> $GITHUB_OUTPUT
              echo "repo=koatty/koatty_serve" >> $GITHUB_OUTPUT
              ;;
            *)
              echo "Unknown repo"
              exit 1
              ;;
          esac
      
      - name: Pull changes from independent repo
        run: |
          echo "🔄 Pulling changes from ${{ steps.info.outputs.repo }}..."
          
          git remote add independent "https://github.com/${{ steps.info.outputs.repo }}.git"
          git fetch independent main
          
          # 创建新分支
          git checkout -b sync-from-${{ github.event.inputs.repo_name }}-$(date +%s)
          
          # 合并独立仓库的更改到对应目录
          git read-tree --prefix=${{ steps.info.outputs.dir }}/ -u independent/main
          
          git commit -m "chore: sync from ${{ steps.info.outputs.repo }}"
          
          echo "✅ Changes synced"
      
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "chore: sync from ${{ steps.info.outputs.repo }}"
          title: "Sync from ${{ github.event.inputs.repo_name }}"
          body: |
            从独立仓库同步更改回 monorepo
            
            - 源仓库: ${{ steps.info.outputs.repo }}
            - 目标目录: ${{ steps.info.outputs.dir }}
            
            请review后合并。
          branch: sync-from-${{ github.event.inputs.repo_name }}
```

---

## 5. 工作流程

### 5.1 日常开发流程

```bash
# 开发者 A 在 Monorepo 开发

# 1. 克隆 monorepo
git clone https://github.com/koatty/koatty-monorepo.git
cd koatty-monorepo

# 2. 创建功能分支
git checkout -b feature/add-xxx

# 3. 修改代码
vim packages/koatty-core/src/xxx.ts

# 4. 提交更改
git add packages/koatty-core
git commit -m "feat(core): add xxx feature"

# 5. 推送并创建 PR
git push origin feature/add-xxx
# 在 GitHub 创建 PR

# 6. PR 合并到 main 后
# ✅ GitHub Actions 自动同步到 koatty/koatty_core
# ✅ 用户 npm install koatty_core 获得最新版
```

### 5.2 用户使用流程

```bash
# 用户完全无感知，照常使用

# 方式 1: 直接安装独立包（推荐）
npm install koatty_core

# 方式 2: 从独立仓库查看代码
git clone https://github.com/koatty/koatty_core.git

# 方式 3: 贡献代码到独立仓库
cd koatty_core
git checkout -b fix/xxx
# ... 修改代码
git push origin fix/xxx
# 创建 PR 到 koatty/koatty_core

# ✅ 维护者会将 PR 同步回 monorepo
```

### 5.3 社区贡献流程

#### 场景 1: PR 提交到独立仓库

```bash
# 1. 用户在独立仓库提交 PR
# https://github.com/koatty/koatty_core/pull/123

# 2. 维护者 review 后，手动同步到 monorepo
cd koatty-monorepo

# 拉取独立仓库的更改
git fetch koatty-core main
git checkout -b sync-pr-123
git read-tree --prefix=packages/koatty-core/ -u koatty-core/main

# 提交到 monorepo
git commit -m "feat(core): sync PR #123 from independent repo"
git push origin sync-pr-123

# 3. 在 monorepo 创建 PR 并合并

# 4. Monorepo PR 合并后自动同步回独立仓库
# ✅ 完整的双向同步！
```

#### 场景 2: Issue 管理

```
策略: 统一在 Monorepo 管理 Issues

独立仓库:
  - 在 README 中说明: "请到主仓库提交 Issue"
  - 配置 Issue 模板重定向到 monorepo
  - 或使用 GitHub bot 自动转发 Issue
```

---

## 6. 最佳实践

### 6.1 版本管理

#### 统一版本号

```json
// 在 monorepo 中统一管理版本
// packages/koatty-core/package.json
{
  "name": "koatty_core",
  "version": "1.20.0",  // 由 Changesets 管理
  "...": "..."
}

// 同步到独立仓库时，版本号保持一致
```

#### 发布流程

```bash
# 1. 在 monorepo 创建 changeset
pnpm changeset

# 2. 更新版本号
pnpm changeset version

# 3. 构建和发布
pnpm build
pnpm release

# 4. 自动触发:
#    - 同步代码到独立仓库
#    - 发布到 npm
#    - 创建 Git tag
#    - 生成 Release Notes
```

---

### 6.2 文档管理

#### 主文档在 Monorepo

```
koatty-monorepo/
├── docs/
│   ├── README.md                    # 主文档
│   ├── packages/
│   │   ├── koatty-core.md          # 各包文档
│   │   ├── koatty-router.md
│   │   └── ...
│   └── guides/
│       ├── getting-started.md
│       └── ...
│
packages/koatty-core/
└── README.md                        # 简化版，指向主文档
```

#### 独立仓库的 README

```markdown
# koatty_core

> ⚠️ 此仓库从 [koatty-monorepo](https://github.com/koatty/koatty-monorepo) 自动同步

## 📦 安装

\```bash
npm install koatty_core
\```

## 📚 文档

完整文档请访问：
- **主文档**: https://koatty.org
- **Monorepo**: https://github.com/koatty/koatty-monorepo/tree/main/packages/koatty-core

## 🤝 贡献

开发请前往主仓库：https://github.com/koatty/koatty-monorepo

## 📝 变更日志

See [CHANGELOG](https://github.com/koatty/koatty-monorepo/blob/main/packages/koatty-core/CHANGELOG.md)
```

---

### 6.3 CI/CD 策略

#### Monorepo CI

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test  # 测试所有包
```

#### 独立仓库 CI

```yaml
# packages/koatty-core/.github/workflows/ci.yml
name: CI (Independent)

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm run build
      - run: npm test  # 只测试当前包
```

---

### 6.4 常见问题处理

#### Q1: 同步冲突怎么办？

```bash
# 如果独立仓库有本地修改导致冲突

# 方案 1: 强制同步（推荐）
git push koatty-core sync-branch:main --force

# 方案 2: 手动合并
git pull koatty-core main
# 解决冲突
git push koatty-core sync-branch:main
```

#### Q2: 历史记录会丢失吗？

```bash
# 不会！git subtree split 保留完整历史

# 验证历史
cd koatty_core
git log --oneline

# 可以看到所有相关的 commit
```

#### Q3: 独立仓库的 PR 如何处理？

```bash
# 1. 手动同步（简单 PR）
git fetch koatty-core pull/123/head:pr-123
git checkout -b sync-pr-123
git read-tree --prefix=packages/koatty-core/ -u pr-123
git commit -m "feat(core): sync PR #123"

# 2. 使用 workflow（复杂 PR）
# 触发 sync-from-independent-repos workflow
# 自动创建 PR 到 monorepo
```

---

## 7. 监控和维护

### 7.1 同步状态监控

#### 创建监控脚本

```bash
#!/bin/bash
# scripts/check-sync-status.sh

# 检查 monorepo 和独立仓库的同步状态

packages=(
  "koatty-core:koatty_core"
  "koatty-router:koatty_router"
  "koatty-serve:koatty_serve"
)

echo "🔍 检查同步状态..."
echo ""

for pkg in "${packages[@]}"; do
  IFS=: read -r mono_name repo_name <<< "$pkg"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 $mono_name → $repo_name"
  
  # 获取 monorepo 最新 commit
  mono_commit=$(git log -1 --format="%H" -- "packages/$mono_name")
  mono_date=$(git log -1 --format="%ai" -- "packages/$mono_name")
  
  echo "  Monorepo:"
  echo "    Commit: ${mono_commit:0:8}"
  echo "    Date: $mono_date"
  
  # 获取独立仓库最新 commit
  repo_commit=$(git ls-remote "https://github.com/koatty/$repo_name.git" HEAD | cut -f1)
  
  echo "  Independent:"
  echo "    Commit: ${repo_commit:0:8}"
  
  # 对比
  if [ "$mono_commit" == "$repo_commit" ]; then
    echo "  状态: ✅ 已同步"
  else
    echo "  状态: ⚠️  未同步"
  fi
  
  echo ""
done
```

---

## 8. 总结

### 8.1 方案优势

| 优势 | 说明 |
|-----|------|
| ✅ **开发效率** | 在 monorepo 享受高效开发体验 |
| ✅ **向后兼容** | 独立仓库保持可用，用户无感知 |
| ✅ **自动化** | GitHub Actions 自动同步，无需手动操作 |
| ✅ **历史保留** | Git 历史完整保留 |
| ✅ **社区友好** | 接受独立仓库的 PR |
| ✅ **灵活性** | 支持双向同步 |

### 8.2 实施检查清单

- [ ] 备份所有独立仓库
- [ ] 配置 monorepo remote
- [ ] 创建同步脚本
- [ ] 配置 GitHub Actions
- [ ] 添加 SYNC_TOKEN secret
- [ ] 测试首次同步
- [ ] 更新独立仓库 README
- [ ] 配置 CI/CD
- [ ] 测试双向同步
- [ ] 更新文档
- [ ] 通知团队和社区

### 8.3 时间规划

| 阶段 | 任务 | 时间 |
|-----|------|------|
| Day 1 | 备份 + 配置 remote | 2小时 |
| Day 2 | 创建同步脚本 + 首次同步 | 4小时 |
| Day 3 | 配置 GitHub Actions | 3小时 |
| Day 4 | 测试和验证 | 4小时 |
| Day 5 | 文档更新 + 团队培训 | 3小时 |
| **总计** | | **2-3天** |

---

## 附录

### A. 完整脚本

所有脚本可在以下位置找到：
- `scripts/sync-to-repos.sh` - 同步到独立仓库
- `scripts/check-sync-status.sh` - 检查同步状态
- `.github/workflows/sync-to-independent-repos.yml` - 自动同步
- `.github/workflows/sync-from-independent-repos.yml` - 反向同步

### B. 参考资料

- [Git Subtree Documentation](https://git-scm.com/docs/git-subtree)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Monorepo Best Practices](https://monorepo.tools/)

---

**文档版本**: 1.0  
**创建日期**: 2025-10-22  
**维护者**: Koatty Team

