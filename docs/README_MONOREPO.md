# Koatty Monorepo 迁移完整指南

> **一站式文档**: 从评估到实施的完整方案  
> **更新日期**: 2025-10-22

---

## 📚 文档导航

### 核心文档 (必读)

| 文档 | 说明 | 受众 | 阅读时间 |
|-----|------|------|---------|
| **[MONOREPO_ARCHITECTURE.md](./MONOREPO_ARCHITECTURE.md)** | 📊 架构设计和包划分策略 | 技术决策者 + 架构师 | 10分钟 |
| **[MONOREPO_MIGRATION_PLAN.md](./MONOREPO_MIGRATION_PLAN.md)** | 📘 完整迁移方案(50+页) | 开发团队 | 30分钟 |
| **[MONOREPO_QUICK_START.md](./MONOREPO_QUICK_START.md)** | 🚀 30分钟快速开始 | 开发者 | 5分钟 |
| **[MONOREPO_SYNC_STRATEGY.md](./MONOREPO_SYNC_STRATEGY.md)** | 🔄 双向同步策略 | 维护者 | 15分钟 |

### 相关文档

| 文档 | 说明 | 状态 |
|-----|------|------|
| **[KOA3_UPGRADE_ANALYSIS.md](./KOA3_UPGRADE_ANALYSIS.md)** | Koa 3.0 升级分析 | ✅ 已完成 |

---

## 🎯 核心决策

### 架构选择

**混合架构**: Monorepo (核心包) + 独立仓库 (工具库)

```
┌─────────────────────────────────────────────┐
│         Monorepo (koatty-monorepo)          │
│  ├── koatty            (主框架)             │
│  ├── koatty_core       (核心)               │
│  ├── koatty_router     (路由)               │
│  ├── koatty_serve      (服务器)             │
│  ├── koatty_exception  (异常)               │
│  ├── koatty_trace      (追踪)               │
│  └── koatty_config     (配置)               │
└─────────────────────────────────────────────┘
                ↓ 自动同步
┌─────────────────────────────────────────────┐
│         独立仓库 (自动镜像)                   │
│  koatty/koatty_core                         │
│  koatty/koatty_router                       │
│  ... (保持向后兼容)                          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         独立工具库 (保持独立)                 │
│  ├── koatty_container  (IOC容器)            │
│  ├── koatty_lib        (工具函数)            │
│  ├── koatty_loader     (加载器)              │
│  └── koatty_logger     (日志)                │
└─────────────────────────────────────────────┘
```

### 技术栈

- **包管理**: pnpm Workspaces
- **构建工具**: Turborepo
- **版本管理**: Changesets
- **同步策略**: Git Subtree Split + GitHub Actions

---

## 🚀 快速开始 (3 步)

### Step 1: 创建 Monorepo (5分钟)

```bash
# 1. 创建目录
mkdir koatty-monorepo && cd koatty-monorepo

# 2. 初始化
pnpm init

# 3. 安装工具
pnpm add -D turbo @changesets/cli

# 4. 创建配置文件
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
  - 'apps/*'
  - 'tools/*'
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

# 5. 创建目录结构
mkdir -p packages apps tools
```

### Step 2: 迁移核心包 (15分钟)

下载并运行迁移脚本：

```bash
# 创建 migrate.sh (见 MONOREPO_QUICK_START.md)
chmod +x migrate.sh
./migrate.sh
```

### Step 3: 配置自动同步 (10分钟)

```bash
# 1. 创建同步脚本 (见 MONOREPO_SYNC_STRATEGY.md)
mkdir -p scripts .github/workflows

# 2. 配置 GitHub Actions
# 复制 sync-to-independent-repos.yml

# 3. 添加 GitHub Token
# 在 GitHub Settings 添加 SYNC_TOKEN secret
```

---

## 📊 预期收益

### 定量收益

| 指标 | 迁移前 | 迁移后 | 改进 |
|-----|-------|-------|------|
| **初始化时间** | 10分钟 (7个repo) | 2分钟 | ⬇️ 80% |
| **构建时间** | 5分钟 (全量) | 30秒 (增量) | ⬇️ 90% |
| **调试时间** | 10分钟 (npm link) | 0秒 (自动) | ⬇️ 100% |
| **发布时间** | 30分钟 (7个包) | 5分钟 (自动) | ⬇️ 83% |
| **磁盘占用** | 2GB (7份依赖) | 500MB (共享) | ⬇️ 75% |

### 定性收益

- ✅ **开发体验**: 无需 npm link，修改即生效
- ✅ **原子提交**: 跨包修改一次提交
- ✅ **统一标准**: 共享配置和工具
- ✅ **向后兼容**: 独立仓库自动更新，用户无感知
- ✅ **社区友好**: 接受独立仓库的 PR

---

## 🎓 学习路径

### 第1天: 理解架构

1. 阅读 [MONOREPO_ARCHITECTURE.md](./MONOREPO_ARCHITECTURE.md) (10分钟)
   - 了解包划分策略
   - 理解依赖关系

2. 阅读 [MONOREPO_SYNC_STRATEGY.md](./MONOREPO_SYNC_STRATEGY.md) (15分钟)
   - 理解双向同步原理
   - 了解 Git Subtree Split

### 第2天: 动手实践

1. 跟随 [MONOREPO_QUICK_START.md](./MONOREPO_QUICK_START.md) (30分钟)
   - 创建测试 monorepo
   - 迁移 2-3 个包
   - 验证构建和测试

### 第3天: 深入学习

1. 阅读 [MONOREPO_MIGRATION_PLAN.md](./MONOREPO_MIGRATION_PLAN.md) (30分钟)
   - 详细了解每个步骤
   - 理解最佳实践
   - 规划正式迁移

---

## 💡 关键特性

### 1. 智能构建缓存

```bash
# 首次构建
pnpm build
# ⏱️ 耗时: 30秒

# 再次构建（无变更）
pnpm build
# ⚡ 耗时: 0.5秒 (from cache!)
```

### 2. 自动依赖管理

```json
{
  "dependencies": {
    "koatty_core": "workspace:*",      // ✨ monorepo 包
    "koatty_container": "^1.17.0"      // 📦 独立包
  }
}
```

发布时自动替换：
```json
{
  "dependencies": {
    "koatty_core": "^1.20.0",          // ✅ 自动替换
    "koatty_container": "^1.17.0"      // ✅ 保持不变
  }
}
```

### 3. 双向同步

```
开发者在 Monorepo 提交
    ↓
GitHub Actions 自动同步
    ↓
独立仓库自动更新
    ↓
用户 npm install 获得最新版

社区在独立仓库提交 PR
    ↓
维护者同步回 Monorepo
    ↓
Monorepo 合并后自动同步回独立仓库
    ↓
完整的双向循环！
```

---

## 🛠️ 常用命令

### 开发

```bash
# 安装依赖
pnpm install

# 开发模式（watch）
pnpm dev

# 构建所有包
pnpm build

# 测试
pnpm test

# Lint
pnpm lint

# 清理
pnpm clean
```

### 包操作

```bash
# 只构建特定包
pnpm --filter koatty_core build

# 为特定包添加依赖
pnpm --filter koatty_core add lodash

# 运行特定包的脚本
pnpm --filter koatty_router test
```

### 版本管理

```bash
# 创建 changeset
pnpm changeset

# 更新版本号
pnpm changeset version

# 发布
pnpm release
```

### 同步

```bash
# 同步到独立仓库
./scripts/sync-to-repos.sh

# 检查同步状态
./scripts/check-sync-status.sh
```

---

## 🔧 故障排除

### 问题 1: pnpm 找不到命令

```bash
npm install -g pnpm@8
```

### 问题 2: workspace 依赖没生效

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 问题 3: 构建缓存问题

```bash
# 清理缓存
rm -rf node_modules/.cache .turbo

# 重新构建
pnpm build
```

### 问题 4: 同步失败

```bash
# 检查 remote 配置
git remote -v

# 手动同步
./scripts/sync-to-repos.sh

# 查看 GitHub Actions 日志
```

---

## 📅 实施时间表

### 快速方案 (1周)

| 天数 | 任务 | 产出 |
|-----|------|------|
| **Day 1** | 创建 monorepo + 配置 | 基础结构 |
| **Day 2-3** | 迁移所有包 | 7个包迁移完成 |
| **Day 4** | 配置自动同步 | GitHub Actions |
| **Day 5** | 测试和验证 | 全面测试 |
| **周末** | 文档和培训 | 团队就绪 |

### 完整方案 (2周)

包含完整的测试、文档、培训和社区通知。

---

## 🤝 获取帮助

### 文档

- **GitHub**: https://github.com/koatty/koatty-monorepo
- **官网**: https://koatty.org
- **问题**: 在对应文档的 Issues 中提问

### 联系

- **Email**: richenlin@gmail.com
- **Discussions**: https://github.com/Koatty/koatty/discussions

---

## ✅ 检查清单

### 迁移前

- [ ] 阅读完所有核心文档
- [ ] 确认 Node.js >= 18.0.0
- [ ] 安装 pnpm >= 8.0.0
- [ ] 备份所有独立仓库
- [ ] 团队达成共识

### 迁移中

- [ ] 创建 monorepo 结构
- [ ] 迁移 7 个核心包
- [ ] 配置 Turborepo
- [ ] 配置自动同步
- [ ] 运行所有测试
- [ ] 验证构建流程

### 迁移后

- [ ] 更新文档
- [ ] 团队培训
- [ ] 社区通知
- [ ] 监控同步状态
- [ ] 收集反馈

---

## 🎉 总结

### 为什么选择这个方案？

1. ✅ **最佳平衡**: 核心包统一管理，工具库保持独立
2. ✅ **向后兼容**: 独立仓库自动同步，用户无感知
3. ✅ **开发效率**: 提升 50%+，调试时间减少 70%+
4. ✅ **社区友好**: 接受独立仓库贡献
5. ✅ **渐进迁移**: 可以逐步实施，风险可控

### 下一步行动

```bash
# 1. 阅读架构文档
open MONOREPO_ARCHITECTURE.md

# 2. 创建测试 monorepo
mkdir koatty-monorepo-test
cd koatty-monorepo-test

# 3. 跟随快速开始指南
open MONOREPO_QUICK_START.md

# 4. 开始迁移！
```

---

**祝你迁移顺利！** 🚀

如有任何问题，随时在 GitHub Discussions 中提问。

---

**文档版本**: 1.0  
**创建日期**: 2025-10-22  
**维护者**: Koatty Team

