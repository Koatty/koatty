# Koatty Monorepo 发布指南

本指南介绍如何在 monorepo 中管理和发布单个库，以及如何同步到独立仓库。

## 📋 目录

1. [工具链说明](#工具链说明)
2. [快速开始](#快速开始)
3. [发布流程（推荐）](#发布流程推荐)
4. [发布流程详解](#发布流程详解)
5. [同步到独立仓库](#同步到独立仓库)
6. [常见操作](#常见操作)
7. [故障排除](#故障排除)

---

## 工具链说明

当前项目使用的工具：

- **pnpm workspace**: 管理 monorepo 的包依赖
- **standard-version**: 各包独立的版本管理工具（遵循语义化版本规范）
- **Changesets**: monorepo 整体的版本管理（可选）
- **Turbo**: 构建系统（缓存和并行构建）
- **npm**: 发布到 npm registry
- **Git subtree**: 同步到独立仓库

---

## 快速开始

### 支持的包

当前 monorepo 包含以下可发布的包：

- `koatty` - Koatty 核心框架
- `koatty-router` - 路由组件
- `koatty-core` - 核心工具库
- `koatty-container` - 容器组件
- `koatty-validation` - 验证组件
- `koatty-config` - 配置组件
- `koatty-exception` - 异常处理组件
- `koatty-serve` - 服务组件
- `koatty-trace` - 链路追踪组件

### 一键发布命令

```bash
# 发布补丁版本（1.0.0 -> 1.0.1）
./scripts/release.sh <package-name>

# 发布次版本（1.0.0 -> 1.1.0）
./scripts/release.sh <package-name> minor

# 发布主版本（1.0.0 -> 2.0.0）
./scripts/release.sh <package-name> major

# 发布预发布版本（1.0.0 -> 1.0.1-0）
./scripts/release.sh <package-name> prerelease

# 发布并自动同步到独立仓库
./scripts/release.sh <package-name> minor --sync

# 模拟发布（不实际执行）
./scripts/release.sh <package-name> --dry-run

# 仅更新版本，不发布到 npm
./scripts/release.sh <package-name> --no-npm
```

### 示例

```bash
# 发布 koatty-router 的补丁版本
./scripts/release.sh koatty-router

# 发布 koatty-core 的次版本并自动同步
./scripts/release.sh koatty-core minor --sync

# 模拟发布 koatty 的主版本
./scripts/release.sh koatty major --dry-run
```

---

## 发布流程（推荐）

### 使用统一发布脚本

这是最推荐的发布方式，脚本会自动处理所有步骤：

```bash
./scripts/release.sh <package-name> [release-type] [options]
```

#### 发布类型

- `patch` - 补丁版本（默认）：bug 修复
- `minor` - 次版本：新功能，向后兼容
- `major` - 主版本：破坏性变更
- `prerelease` - 预发布版本：测试版本

#### 选项

- `--dry-run` - 模拟运行，不实际发布
- `--sync` - 发布后自动同步到独立仓库
- `--no-npm` - 跳过 npm 发布，仅更新版本

#### 发布脚本会自动执行以下步骤：

1. ✅ 运行测试
2. 🔨 构建项目
3. 📝 使用 `standard-version` 更新版本和 CHANGELOG
4. 📦 发布到 npm（除非使用 `--no-npm`）
5. 🏷️ 创建 Git tag 并推送到远程
6. 🔄 同步到独立仓库（如果使用 `--sync`）

### 完整发布示例

```bash
# 1. 确保代码已提交
git status

# 2. 发布 koatty-router 的新版本（自动同步）
./scripts/release.sh koatty-router minor --sync

# 脚本会提示：
# - 当前版本
# - 将要发布的新版本
# - 是否继续发布
# - npm 登录状态

# 3. 发布完成后，创建 GitHub Release
# https://github.com/koatty/koatty-monorepo/releases/new
```

---

## 发布流程详解

### 方式一：使用 release.sh 脚本（推荐）

#### 步骤 1: 准备工作

```bash
# 确保在 master 分支
git checkout master
git pull origin master

# 确保所有代码已提交
git status

# 登录 npm（首次发布需要）
npm login
npm whoami
```

#### 步骤 2: 执行发布

```bash
# 进入项目根目录
cd /path/to/koatty-monorepo

# 执行发布脚本
./scripts/release.sh koatty-router minor --sync
```

发布脚本的执行过程：

```
========================================
Koatty 包发布流程
========================================

包名:       koatty_router
当前版本:   1.9.5
发布类型:   minor
包目录:     packages/koatty-router
自动同步:   启用

✓ npm 用户: your-username

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
步骤 1/6: 运行测试
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 测试通过

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
步骤 2/6: 构建项目
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 构建成功
✓ 构建产物验证通过

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
步骤 3/6: 更新版本 (standard-version)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
运行: standard-version --release-as minor

✓ 版本更新成功
版本变更: 1.9.5 → 1.10.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
步骤 4/6: 发布到 npm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
确认发布 koatty_router@1.10.0 到 npm? (y/n)
✓ 发布到 npm 成功

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
步骤 5/6: 推送到 Git 远程仓库
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 推送成功
✓ 创建 tag: koatty-router@1.10.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
步骤 6/6: 同步到独立仓库
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 同步到独立仓库成功

========================================
✓ 发布完成!
========================================
```

#### 步骤 3: 创建 GitHub Release

发布完成后，访问以下链接创建 Release：

```
Monorepo Release:
https://github.com/koatty/koatty-monorepo/releases/new?tag=koatty-router@1.10.0

独立仓库 Release:
https://github.com/koatty/koatty_router/releases/new
```

---

### 方式二：使用包内的 npm scripts

每个包都包含 `standard-version` 脚本，可以手动执行：

```bash
# 进入包目录
cd packages/koatty-router

# 发布补丁版本
npm run release

# 发布次版本
npm run release:minor

# 发布主版本
npm run release:major

# 发布预发布版本
npm run release:pre

# 手动发布到 npm
npm publish

# 回到根目录，推送代码和标签
cd ../..
git push --follow-tags origin master
```

**注意**: 这种方式需要手动创建 tag 并同步到独立仓库。

---

### 方式三：使用 Changesets（monorepo 全局）

Changesets 适用于批量发布多个包：

```bash
# 1. 创建 changeset
pnpm changeset

# 2. 应用版本变更
pnpm changeset version

# 3. 提交变更
git add .
git commit -m "chore: version packages"
git push origin master

# 4. 发布所有有变更的包
pnpm release
```

---

## 同步到独立仓库

### 自动同步（推荐）

在发布时使用 `--sync` 选项：

```bash
./scripts/release.sh koatty-router minor --sync
```

### 手动同步

```bash
# 使用同步脚本
./scripts/sync-standalone.sh koatty-router

# 或指定自定义仓库 URL
./scripts/sync-standalone.sh koatty-router git@github.com:koatty/koatty_router.git
```

### 同步脚本说明

`sync-standalone.sh` 脚本会：

1. 添加或更新独立仓库的 remote
2. 使用 `git subtree` 推送代码到独立仓库
3. 同步相关的 tags
4. 处理可能的冲突

支持的独立仓库：

- `koatty` → `https://github.com/koatty/koatty.git`
- `koatty-router` → `https://github.com/koatty/koatty_router.git`
- `koatty-core` → `https://github.com/koatty/koatty_core.git`
- `koatty-container` → `https://github.com/koatty/koatty_container.git`
- `koatty-validation` → `https://github.com/koatty/koatty_validation.git`
- `koatty-config` → `https://github.com/koatty/koatty_config.git`
- `koatty-exception` → `https://github.com/koatty/koatty_exception.git`
- `koatty-serve` → `https://github.com/koatty/koatty_serve.git`
- `koatty-trace` → `https://github.com/koatty/koatty_trace.git`

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

### 模拟发布流程

```bash
# 查看发布会做什么，但不实际执行
./scripts/release.sh koatty-router minor --dry-run
```

### 仅更新版本，不发布

```bash
# 适用于在发布前手动检查
./scripts/release.sh koatty-router --no-npm
```

### 发布预发布版本

```bash
# 发布 beta 版本
./scripts/release.sh koatty-router prerelease

# 手动指定 npm tag
cd packages/koatty-router
npm publish --tag beta
```

### 查看包在 npm 上的信息

```bash
# 查看最新版本
npm view koatty_router version

# 查看所有版本
npm view koatty_router versions

# 查看完整信息
npm view koatty_router
```

### 批量操作

```bash
# 构建所有包
pnpm build

# 测试所有包
pnpm test

# Lint 所有包
pnpm lint
```

---

## 完整发布示例

### 示例 1: 发布 koatty-router 的 bug 修复版本

```bash
# 1. 修复 bug，提交代码
git add .
git commit -m "fix(koatty-router): fix routing issue"
git push origin master

# 2. 发布 patch 版本
./scripts/release.sh koatty-router

# 3. 手动同步到独立仓库（或使用 --sync）
./scripts/sync-standalone.sh koatty-router

# 4. 创建 GitHub Release
# 访问发布完成后提示的 URL
```

### 示例 2: 发布 koatty-core 的新功能

```bash
# 1. 开发新功能，提交代码
git add .
git commit -m "feat(koatty-core): add new helper functions"
git push origin master

# 2. 发布 minor 版本并自动同步
./scripts/release.sh koatty-core minor --sync

# 3. 创建 GitHub Release
```

### 示例 3: 发布 koatty 的主版本（破坏性变更）

```bash
# 1. 完成重大更新，提交代码
git add .
git commit -m "feat(koatty)!: upgrade to Koa v3"
git push origin master

# 2. 模拟发布，检查输出
./scripts/release.sh koatty major --dry-run

# 3. 确认无误后，执行发布
./scripts/release.sh koatty major --sync

# 4. 创建 GitHub Release，标注 Breaking Changes
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
npm access public @koatty/router
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

### 问题1: standard-version 未安装

**错误信息**:
```
错误: 未安装 standard-version
```

**解决方案**:
```bash
# 全局安装
npm install -g standard-version

# 或在包目录安装
cd packages/koatty-router
npm install standard-version --save-dev
```

### 问题2: npm publish 权限错误

**错误信息**:
```
npm ERR! code E403
npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/koatty_router
```

**解决方案**:
```bash
# 检查登录状态
npm whoami

# 重新登录
npm logout
npm login

# 检查包所有者
npm owner ls koatty_router

# 添加所有者（如果需要）
npm owner add <username> koatty_router
```

### 问题3: git subtree push 失败

**错误信息**:
```
error: failed to push some refs
```

**解决方案**:

脚本会自动使用 fallback 方案，但你也可以手动执行：

```bash
# 方式 1: 使用 split + force push
git subtree split --prefix=packages/koatty-router -b temp-branch
git push koatty-router-standalone temp-branch:master --force
git branch -D temp-branch

# 方式 2: 重新添加 remote
git remote remove koatty-router-standalone
git remote add koatty-router-standalone git@github.com:koatty/koatty_router.git
./scripts/sync-standalone.sh koatty-router
```

### 问题4: 版本号冲突

**错误信息**:
```
npm ERR! You cannot publish over the previously published versions
```

**解决方案**:
```bash
# 查看 npm 上的版本
npm view koatty_router version

# 查看本地版本
cd packages/koatty-router
node -p "require('./package.json').version"

# 如果本地版本号 <= npm 版本号，需要手动升级
# 然后重新发布
./scripts/release.sh koatty-router minor
```

### 问题5: workspace:* 依赖未被替换

**错误信息**:
```
✗ 错误: dist/package.json 仍包含 workspace:* 依赖
```

**解决方案**:

检查包的构建脚本是否包含 `build:fix` 步骤：

```json
{
  "scripts": {
    "build": "npm run build:js && npm run build:dts && npm run build:cp && npm run build:fix",
    "build:fix": "node scripts/fixWorkspaceDeps"
  }
}
```

如果缺少，需要添加 `scripts/fixWorkspaceDeps.js` 脚本。

### 问题6: 测试失败

**错误信息**:
```
✗ 测试失败
```

**解决方案**:
```bash
# 查看详细测试输出
cd packages/koatty-router
npm test

# 清理并重新安装依赖
rm -rf node_modules
npm install

# 重新测试
npm test
```

### 问题7: 构建失败

**解决方案**:
```bash
cd packages/koatty-router

# 清理构建产物
rm -rf dist

# 重新构建
npm run build

# 如果仍然失败，检查 TypeScript 配置
npx tsc --noEmit
```

---

## 高级配置

### 自定义 standard-version 配置

在包目录创建 `.versionrc.js`：

```javascript
module.exports = {
  types: [
    { type: 'feat', section: '✨ Features' },
    { type: 'fix', section: '🐛 Bug Fixes' },
    { type: 'perf', section: '⚡ Performance' },
    { type: 'refactor', section: '♻️ Refactor' },
    { type: 'docs', section: '📝 Documentation' },
    { type: 'style', hidden: true },
    { type: 'chore', hidden: true },
    { type: 'test', hidden: true }
  ],
  releaseCommitMessageFormat: 'chore(release): {{currentTag}}',
  scripts: {
    postchangelog: 'node scripts/updateDocs.js'
  }
};
```

### 配置 Changesets

编辑 `.changeset/config.json`：

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "master",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### 配置根目录快捷命令

在根目录 `package.json` 添加：

```json
{
  "scripts": {
    "pkg:release": "bash scripts/release.sh",
    "pkg:release:minor": "bash scripts/release.sh",
    "pkg:release:major": "bash scripts/release.sh",
    "pkg:release:pre": "bash scripts/release.sh",
    "pkg:sync": "bash scripts/sync-standalone.sh"
  }
}
```

使用方式：

```bash
# 注意：这些命令需要传递包名参数
pnpm pkg:release koatty-router minor --sync
```

---

## 最佳实践

### 1. 版本规范

遵循语义化版本规范（Semantic Versioning）：

- **Major** (主版本): 破坏性变更
- **Minor** (次版本): 新功能，向后兼容
- **Patch** (补丁版本): bug 修复，向后兼容
- **Prerelease** (预发布): 测试版本

### 2. Commit 规范

使用 Conventional Commits 规范：

```
feat: 新功能
fix: bug 修复
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
perf: 性能优化
test: 测试
chore: 构建/工具链
```

### 3. 发布前检查清单

- [ ] 所有测试通过
- [ ] 代码已经过 code review
- [ ] CHANGELOG 更新准确
- [ ] 文档已更新
- [ ] 无 workspace:* 依赖残留
- [ ] 已登录 npm
- [ ] 版本号符合语义化规范

### 4. 发布后检查清单

- [ ] npm 上可以安装新版本
- [ ] 独立仓库已同步
- [ ] GitHub Release 已创建
- [ ] 文档网站已更新
- [ ] 通知用户升级

---

## 总结

### 推荐工作流程

1. **开发**: 在 monorepo 中开发功能或修复 bug
2. **测试**: 运行测试确保代码质量
3. **提交**: 使用规范的 commit message
4. **发布**: 使用 `./scripts/release.sh` 统一发布
5. **同步**: 自动或手动同步到独立仓库
6. **Release**: 在 GitHub 创建 Release 记录

### 快速参考

```bash
# 发布补丁版本
./scripts/release.sh <package> patch

# 发布次版本
./scripts/release.sh <package> minor

# 发布主版本
./scripts/release.sh <package> major

# 发布预发布版本
./scripts/release.sh <package> prerelease

# 发布并自动同步
./scripts/release.sh <package> minor --sync

# 模拟发布
./scripts/release.sh <package> --dry-run

# 手动同步到独立仓库
./scripts/sync-standalone.sh <package>
```

---

## 相关资源

- **Koatty Monorepo**: https://github.com/koatty/koatty-monorepo
- **standard-version**: https://github.com/conventional-changelog/standard-version
- **Semantic Versioning**: https://semver.org/
- **Conventional Commits**: https://www.conventionalcommits.org/
- **pnpm Workspace**: https://pnpm.io/workspaces
- **Git Subtree**: https://git-scm.com/docs/git-subtree
- **Changesets**: https://github.com/changesets/changesets

---

**需要帮助?** 请在 [GitHub Issues](https://github.com/koatty/koatty-monorepo/issues) 提出问题。
