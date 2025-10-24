# Koatty Monorepo 发布指南

本指南介绍如何在 monorepo 中管理和发布单个库，以及如何同步到独立仓库。

## 📋 目录

1. [工具链说明](#工具链说明)
2. [发布单个库的完整流程](#发布单个库的完整流程)
3. [同步到独立仓库](#同步到独立仓库)
4. [常见操作](#常见操作)
5. [故障排除](#故障排除)

---

## 工具链说明

当前项目使用的工具：

- **pnpm workspace**: 管理 monorepo 的包依赖
- **Changesets**: 管理版本和变更日志
- **Turbo**: 构建系统（缓存和并行构建）
- **npm**: 发布到 npm registry

---

## 发布单个库的完整流程

### 方式一：使用 Changesets（推荐）

这是最标准的 monorepo 发布流程。

#### 步骤 1: 创建 Changeset

当你完成了代码变更（如刚完成的 koatty-router v2.0.0），创建一个 changeset：

```bash
# 在项目根目录执行
pnpm changeset
```

这会启动交互式命令行：

```
🦋  Which packages would you like to include?
› ◯ koatty_core
  ◯ koatty_container
  ◉ koatty_router    # 选择你要发布的包
  ◯ koatty_validation

🦋  Which packages should have a major bump?
  ◉ koatty_router    # 选择版本类型

🦋  Which packages should have a minor bump?
  ◯ koatty_router

🦋  Which packages should have a patch bump?
  ◯ koatty_router

🦋  Please enter a summary for this change
Major release with performance improvements and breaking changes
```

这会在 `.changeset/` 目录创建一个文件，例如：

```markdown
---
"koatty_router": major
---

Major release v2.0.0:
- Removed deprecated validatorFuncs
- Removed performance statistics with concurrency issues
- Enhanced memory optimization
- All validators must be pre-compiled
- 100% backward compatible API
```

#### 步骤 2: 提交 Changeset

```bash
git add .changeset/
git commit -m "chore: add changeset for koatty-router v2.0.0"
git push origin master
```

#### 步骤 3: 更新版本

```bash
# 应用所有 changesets，更新版本号和 CHANGELOG
pnpm changeset version
```

这会：
- 更新 `packages/koatty-router/package.json` 的版本号
- 自动更新 `packages/koatty-router/CHANGELOG.md`
- 删除已应用的 changeset 文件
- 更新依赖此包的其他包

#### 步骤 4: 提交版本变更

```bash
git add .
git commit -m "chore: release koatty-router v2.0.0"
git push origin master
```

#### 步骤 5: 构建和发布

```bash
# 方式 A: 发布所有有变更的包
pnpm release

# 方式 B: 只发布单个包
cd packages/koatty-router
npm run build
npm publish

# 发布后打 tag
git tag koatty-router@2.0.0
git push origin koatty-router@2.0.0
```

---

### 方式二：手动发布单个包（快速方式）

如果你只想快速发布一个包，不想走完整的 changeset 流程：

```bash
# 1. 进入包目录
cd packages/koatty-router

# 2. 手动更新版本号（已经是 2.0.0，跳过此步）
# npm version 2.0.0

# 3. 构建
npm run build

# 4. 测试（确保所有测试通过）
npm test

# 5. 发布到 npm
npm publish

# 6. 打 tag 并推送
git tag koatty-router@2.0.0
git push origin koatty-router@2.0.0
git push origin master
```

**注意**: 这种方式需要手动维护 CHANGELOG.md

---

## 同步到独立仓库

### 方式一：使用 Git Subtree（推荐）

这是最干净的方式，保留完整的提交历史。

#### 初次设置

```bash
# 在 monorepo 根目录

# 1. 添加独立仓库作为 remote
git remote add koatty-router-standalone git@github.com:koatty/koatty_router.git

# 2. 第一次推送（使用 subtree split）
git subtree push --prefix=packages/koatty-router koatty-router-standalone master

# 如果遇到冲突或想强制推送
git subtree split --prefix=packages/koatty-router -b koatty-router-temp
git push koatty-router-standalone koatty-router-temp:master --force
git branch -D koatty-router-temp
```

#### 日常同步

每次在 monorepo 中更新 koatty-router 后：

```bash
# 推送最新变更到独立仓库
git subtree push --prefix=packages/koatty-router koatty-router-standalone master

# 同步 tags
git push koatty-router-standalone --tags
```

---

### 方式二：使用自动化脚本

创建一个同步脚本 `scripts/sync-standalone.sh`：

```bash
#!/bin/bash

PACKAGE_NAME=$1
STANDALONE_REMOTE=$2

if [ -z "$PACKAGE_NAME" ] || [ -z "$STANDALONE_REMOTE" ]; then
  echo "Usage: ./scripts/sync-standalone.sh <package-name> <remote-url>"
  echo "Example: ./scripts/sync-standalone.sh koatty-router git@github.com:koatty/koatty_router.git"
  exit 1
fi

PACKAGE_DIR="packages/$PACKAGE_NAME"

if [ ! -d "$PACKAGE_DIR" ]; then
  echo "Error: Package directory $PACKAGE_DIR does not exist"
  exit 1
fi

echo "Syncing $PACKAGE_NAME to standalone repository..."

# 添加 remote（如果不存在）
if ! git remote | grep -q "$PACKAGE_NAME-standalone"; then
  git remote add "$PACKAGE_NAME-standalone" "$STANDALONE_REMOTE"
fi

# 使用 subtree 推送
git subtree push --prefix="$PACKAGE_DIR" "$PACKAGE_NAME-standalone" master

# 同步 tags
echo "Syncing tags..."
git push "$PACKAGE_NAME-standalone" --tags

echo "✅ Successfully synced $PACKAGE_NAME to standalone repository"
```

使用方式：

```bash
chmod +x scripts/sync-standalone.sh
./scripts/sync-standalone.sh koatty-router git@github.com:koatty/koatty_router.git
```

---

### 方式三：使用 GitHub Actions 自动同步

创建 `.github/workflows/sync-standalone.yml`：

```yaml
name: Sync to Standalone Repositories

on:
  push:
    tags:
      - 'koatty-router@*'
      - 'koatty-*@*'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Extract package info
        id: package
        run: |
          TAG=${GITHUB_REF#refs/tags/}
          PACKAGE_NAME=$(echo $TAG | cut -d@ -f1)
          VERSION=$(echo $TAG | cut -d@ -f2)
          echo "package=$PACKAGE_NAME" >> $GITHUB_OUTPUT
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Sync koatty-router
        if: steps.package.outputs.package == 'koatty-router'
        env:
          SSH_KEY: ${{ secrets.STANDALONE_DEPLOY_KEY }}
        run: |
          eval `ssh-agent -s`
          ssh-add - <<< "${SSH_KEY}"
          git remote add standalone git@github.com:koatty/koatty_router.git
          git subtree push --prefix=packages/koatty-router standalone master
          git push standalone --tags

      # 为其他包添加类似的步骤
```

---

## 常见操作

### 仅构建单个包

```bash
# 使用 turbo filter
pnpm turbo run build --filter=koatty_router

# 或直接在包目录
cd packages/koatty-router && npm run build
```

### 仅测试单个包

```bash
pnpm turbo run test --filter=koatty_router
```

### 查看哪些包需要发布

```bash
pnpm changeset status
```

### 发布预发布版本

```bash
# 1. 创建预发布版本
cd packages/koatty-router
npm version 2.0.0-beta.1

# 2. 发布到 npm（带 tag）
npm publish --tag beta

# 3. 用户安装预发布版本
npm install koatty_router@beta
```

### 批量更新多个包

```bash
# 创建 changeset 选择多个包
pnpm changeset

# 应用所有变更
pnpm changeset version

# 发布所有有变更的包
pnpm release
```

---

## 完整的 koatty-router v2.0.0 发布流程示例

基于你刚完成的工作，以下是完整流程：

```bash
# 1. 确保在 master 分支且代码已提交
git status
git checkout master
git pull origin master

# 2. 创建 changeset
pnpm changeset
# 选择 koatty_router
# 选择 major（因为有 breaking changes）
# 输入变更摘要

# 3. 提交 changeset
git add .
git commit -m "chore: add changeset for koatty-router v2.0.0"
git push origin master

# 4. 应用版本变更
pnpm changeset version
git add .
git commit -m "chore: release koatty-router v2.0.0"
git push origin master

# 5. 构建和发布
cd packages/koatty-router
npm run build
npm test
npm publish

# 6. 打标签
git tag koatty-router@2.0.0
git push origin koatty-router@2.0.0

# 7. 同步到独立仓库
cd ../..  # 回到根目录
git subtree push --prefix=packages/koatty-router koatty-router-standalone master
git push koatty-router-standalone koatty-router@2.0.0

# 8. 在 GitHub 创建 Release
# 访问 https://github.com/koatty/koatty_router/releases/new
# 选择 tag: koatty-router@2.0.0
# 标题: v2.0.0
# 描述: 复制 CHANGELOG.md 中的相关内容
```

---

## 配置 NPM 访问权限

### 第一次发布前的准备

```bash
# 1. 登录 npm
npm login

# 2. 检查登录状态
npm whoami

# 3. 检查包的访问权限
npm access list packages

# 4. 如果是 scoped package (@koatty/router)，设置为 public
npm access public koatty_router
```

### 配置 .npmrc（可选）

在包目录或根目录创建 `.npmrc`：

```ini
# 发布配置
registry=https://registry.npmjs.org/
access=public

# 如果使用 private registry
# registry=https://your-private-registry.com/
```

---

## 故障排除

### 问题1: git subtree push 太慢或失败

**解决方案**: 使用 split 然后 push

```bash
git subtree split --prefix=packages/koatty-router -b temp-branch
git push koatty-router-standalone temp-branch:master --force
git branch -D temp-branch
```

### 问题2: npm publish 权限错误

```bash
# 检查登录状态
npm whoami

# 重新登录
npm login

# 检查包所有者
npm owner ls koatty_router

# 添加所有者（如果需要）
npm owner add <username> koatty_router
```

### 问题3: 版本冲突

```bash
# 查看当前版本
npm view koatty_router version

# 如果版本已存在，需要递增版本号
npm version patch  # 2.0.0 -> 2.0.1
npm version minor  # 2.0.0 -> 2.1.0
npm version major  # 2.0.0 -> 3.0.0
```

### 问题4: Changeset 冲突

```bash
# 查看待处理的 changesets
pnpm changeset status

# 清理并重新创建
rm -rf .changeset/*.md  # 不要删除 config.json 和 README.md
pnpm changeset
```

### 问题5: 构建失败

```bash
# 清理并重新构建
cd packages/koatty-router
rm -rf dist node_modules
pnpm install
pnpm run build
```

---

## 高级配置

### 配置 Changesets 自动化

编辑 `.changeset/config.json`：

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": true,              // 自动提交
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "master",
  "updateInternalDependencies": "patch",
  "ignore": [],
  "___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": {
    "onlyUpdatePeerDependentsWhenOutOfRange": true
  }
}
```

### 配置发布脚本

在根目录 `package.json` 添加：

```json
{
  "scripts": {
    "release:router": "pnpm --filter koatty_router build && pnpm --filter koatty_router publish",
    "sync:router": "./scripts/sync-standalone.sh koatty-router git@github.com:koatty/koatty_router.git"
  }
}
```

---

## 总结

### 推荐工作流程

1. **日常开发**: 在 monorepo 中开发
2. **版本管理**: 使用 Changesets 管理版本
3. **发布包**: 使用 `npm publish` 发布到 npm
4. **同步仓库**: 使用 `git subtree` 同步到独立仓库
5. **自动化**: 使用 GitHub Actions 自动化发布流程

### 快速参考

```bash
# 创建变更
pnpm changeset

# 应用版本
pnpm changeset version

# 发布单个包
cd packages/<package> && npm publish

# 同步到独立仓库
git subtree push --prefix=packages/<package> <remote> master
```

---

**需要帮助?** 

- Changesets 文档: https://github.com/changesets/changesets
- pnpm workspace: https://pnpm.io/workspaces
- Git subtree: https://git-scm.com/docs/git-subtree

