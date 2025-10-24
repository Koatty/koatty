# Koatty Monorepo Scripts

本目录包含 Koatty Monorepo 的自动化脚本。

## 📜 脚本列表

### 🚀 release.sh - 统一发布脚本（推荐使用）

**用途**: 发布单个包到 npm，支持完整的版本管理流程。

**功能**:
- ✅ 自动运行测试
- ✅ 自动构建项目
- ✅ 使用 `standard-version` 自动更新版本号和 CHANGELOG
- ✅ 发布到 npm
- ✅ 创建 Git tag 并推送
- ✅ 可选自动同步到独立仓库

**用法**:
```bash
# 基本用法
./scripts/release.sh <package-name> [release-type] [options]

# 发布类型
patch       # 补丁版本 (1.0.0 -> 1.0.1)
minor       # 次版本 (1.0.0 -> 1.1.0)
major       # 主版本 (1.0.0 -> 2.0.0)
prerelease  # 预发布版本 (1.0.0 -> 1.0.1-0)

# 选项
--dry-run   # 模拟发布
--sync      # 自动同步到独立仓库
--no-npm    # 跳过 npm 发布
```

**示例**:
```bash
# 发布 koatty-router 的补丁版本
./scripts/release.sh koatty-router

# 发布 koatty-core 的次版本并自动同步
./scripts/release.sh koatty-core minor --sync

# 模拟发布 koatty 的主版本
./scripts/release.sh koatty major --dry-run
```

---

### 🔄 sync-standalone.sh - 同步到独立仓库

**用途**: 将 monorepo 中的包同步到对应的独立 GitHub 仓库。

**功能**:
- ✅ 使用 `git subtree` 推送代码
- ✅ 自动同步 tags
- ✅ 支持所有 packages 下的包

**用法**:
```bash
./scripts/sync-standalone.sh <package-name> [remote-url]
```

**示例**:
```bash
# 使用预配置的仓库地址
./scripts/sync-standalone.sh koatty-router

# 使用自定义仓库地址
./scripts/sync-standalone.sh koatty-router git@github.com:koatty/koatty_router.git
```

**支持的包**:
- `koatty`
- `koatty-router`
- `koatty-core`
- `koatty-container`
- `koatty-validation`
- `koatty-config`
- `koatty-exception`
- `koatty-serve`
- `koatty-trace`

---

### 🔨 build.sh - 构建脚本

**用途**: 批量构建或构建特定包。

**用法**:
```bash
./scripts/build.sh [package-name]
```

---

### 🔍 check-sync-status.sh - 检查同步状态

**用途**: 检查 monorepo 和独立仓库的同步状态。

**用法**:
```bash
./scripts/check-sync-status.sh <package-name>
```

---

## 🎯 推荐工作流程

### 完整发布流程

```bash
# 1. 确保代码已提交
git status

# 2. 发布新版本（自动执行测试、构建、版本更新、发布、同步）
./scripts/release.sh koatty-router minor --sync

# 3. 创建 GitHub Release
# 访问脚本输出的 URL 创建 Release
```

### 仅同步到独立仓库

```bash
# 如果版本已经发布到 npm，只需要同步代码
./scripts/sync-standalone.sh koatty-router
```

### 测试发布流程

```bash
# 模拟发布，查看会执行哪些操作
./scripts/release.sh koatty-router minor --dry-run
```

---

## 📚 相关文档

- [发布指南](../RELEASE-GUIDE.md) - 详细的发布流程说明
- [任务文档](../TASK.md) - 项目任务和进度追踪

---

## 🔧 维护说明

### 添加新包支持

如果添加了新的包，需要更新以下文件：

1. **`scripts/release.sh`** - 在 `PACKAGE_REPOS` 中添加新包的映射
2. **`scripts/sync-standalone.sh`** - 在 `PACKAGE_REPOS` 中添加新包的映射

示例：

```bash
declare -A PACKAGE_REPOS=(
    # ... 现有包 ...
    ["new-package"]="https://github.com/koatty/new_package.git"
)
```

### 脚本依赖

所有脚本依赖于以下工具：

- `bash` - Shell 环境
- `git` - 版本控制
- `npm` - 包管理和发布
- `standard-version` - 版本管理（需要在各包中安装）
- `node` - 运行 JavaScript 脚本

---

## ⚠️ 注意事项

1. **首次发布前**请确保：
   - 已登录 npm: `npm login`
   - 有包的发布权限
   - 有独立仓库的推送权限

2. **脚本执行权限**：
   ```bash
   chmod +x scripts/*.sh
   ```

3. **使用 SSH 还是 HTTPS**：
   - SSH: `git@github.com:koatty/package.git` (推荐，需配置 SSH 密钥)
   - HTTPS: `https://github.com/koatty/package.git` (需输入凭据)

---

## 🐛 故障排除

### 问题：standard-version 未安装

```bash
# 全局安装
npm install -g standard-version

# 或在包目录安装
cd packages/<package-name>
npm install standard-version --save-dev
```

### 问题：git subtree push 失败

脚本会自动使用 fallback 方案（split + force push）。

### 问题：npm 权限错误

```bash
npm whoami  # 检查登录状态
npm login   # 重新登录
```

更多故障排除信息，请参考 [RELEASE-GUIDE.md](../RELEASE-GUIDE.md#故障排除)。

