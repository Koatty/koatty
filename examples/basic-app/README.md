# Koatty Basic Application Example

这是一个基本的 Koatty 应用示例,位于 `packages/koatty/examples/basic-app` 目录下。

## 目录结构

```
packages/koatty/examples/basic-app/
├── src/
│   ├── App.ts              # 应用入口
│   ├── bootstrap/          # 启动引导
│   ├── controller/         # 控制器
│   ├── service/            # 服务层
│   ├── middleware/         # 中间件
│   ├── dto/                # 数据传输对象
│   ├── aspect/             # 切面
│   ├── plugin/             # 插件
│   └── config/             # 配置文件
├── package.json
└── tsconfig.json
```

## 安装依赖

```bash
cd packages/koatty/examples/basic-app
pnpm install
```

## 运行

### 开发模式

```bash
pnpm run dev
```

### VSCode 调试

1. 在 VSCode 中打开项目根目录
2. 按 F5 或点击调试面板中的 "Koatty Demo Program"
3. 可以在 `packages/koatty/src` 目录下的源码中设置断点进行调试

## 导入说明

由于示例项目位于 `packages/koatty/examples/basic-app` 下,使用相对路径导入 Koatty 框架:

```typescript
// 导入 Koatty 核心功能
import { Bootstrap } from "../../../src";
import { Koatty } from "../../../../koatty-core/src";
import { AppEvent, KoattyApplication } from "../../../../../koatty-core/src";
```

这样可以直接调试框架源码,无需编译。

## 配置文件

配置文件位于 `src/config/` 目录:

- `config.ts` - 主配置文件
- `router.ts` - 路由配置
- `middleware.ts` - 中间件配置
- `plugin.ts` - 插件配置
- `db.ts` - 数据库配置

## 项目特点

- ✅ 支持 TypeScript 源码级调试
- ✅ 使用相对路径直接引用框架源码
- ✅ 完整的 MVC 架构示例
- ✅ 包含控制器、服务、中间件、切面等示例代码
