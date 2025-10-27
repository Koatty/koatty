# Koatty Monorepo

> Koatty Framework 的 Monorepo 仓库，包含所有核心包的统一管理

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange)](https://pnpm.io/)
[![License](https://img.shields.io/badge/license-BSD--3--Clause-blue)](LICENSE)

## 📚 目录

- [简介](#简介)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [开发指南](#开发指南)
- [版本管理](#版本管理)
- [自动同步](#自动同步)
- [文档](#文档)

## 简介

Koatty Monorepo 采用 **混合架构**，将核心框架包集中管理，同时保持向后兼容。

### 核心包 (7个)

| 包名 | 说明 | 
|------|------|
| `koatty` | 主框架 |
| `koatty_core` | 核心功能 | 
| `koatty_router` | 路由组件 |
| `koatty_serve` | 服务器组件 | 
| `koatty_exception` | 异常处理 |
| `koatty_trace` | 链路追踪 |
| `koatty_config` | 配置加载 |

### 独立包 (保持独立)

- `koatty_container` - IoC 容器
- `koatty_lib` - 工具函数库
- `koatty_loader` - 加载器
- `koatty_logger` - 日志库

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装

```bash
# 克隆仓库
git clone https://github.com/koatty/koatty-monorepo.git
cd koatty-monorepo

# 安装依赖
pnpm install

# 构建所有包
pnpm build
```

### 开发

```bash
# 开发模式 (watch)
pnpm dev

# 测试
pnpm test

# Lint
pnpm lint
```

### 运行示例

```bash
# 运行基础应用示例
cd examples/basic-app
pnpm dev

# 或使用VS Code调试 (推荐)
# 按F5，选择 "Koatty Basic App"
```

查看更多示例: [examples/README.md](examples/README.md)

## 项目结构

```
koatty-monorepo/
├── packages/               # 核心包
│   ├── koatty/            # 主框架
│   ├── koatty-core/       # 核心
│   ├── koatty-router/     # 路由
│   ├── koatty-serve/      # 服务器
│   ├── koatty-exception/  # 异常
│   ├── koatty-trace/      # 追踪
│   └── koatty-config/     # 配置
├── scripts/               # 工具脚本
│   ├── sync-to-repos.sh
│   ├── check-sync-status.sh
│   └── release.sh
├── .changeset/            # 版本管理
├── .github/workflows/     # CI/CD
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 开发指南

### 包操作

```bash
# 只构建特定包
pnpm --filter koatty_core build

# 为特定包添加依赖
pnpm --filter koatty_core add lodash

# 运行特定包的脚本
pnpm --filter koatty_router test

# 在特定包中执行命令
pnpm --filter koatty_core dev
```

### 清理

```bash
# 清理所有构建产物
pnpm clean

# 清理并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 版本管理

使用 [Changesets](https://github.com/changesets/changesets) 管理版本：

```bash
# 1. 创建 changeset
pnpm changeset

# 2. 更新版本号
pnpm changeset version

# 3. 发布
pnpm release
```

## 自动同步

Monorepo 中的更改会自动同步到独立仓库，保持向后兼容。

### GitHub Actions

- **同步到独立仓库**: 推送到 main/master 分支时自动触发
- **反向同步**: 手动触发，从独立仓库同步回 monorepo

### 手动同步

```bash
# 检查同步状态
./scripts/check-sync-status.sh

# 手动同步
./scripts/sync-standalone.sh
```

## 文档

- [同步策略](RELEASE-GUIDE.md)


## License

BSD-3-Clause © [richenlin](mailto:richenlin@gmail.com)

