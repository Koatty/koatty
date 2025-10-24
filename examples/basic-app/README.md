# Koatty Basic Application Example

这是一个完整的Koatty框架基础应用示例，展示了框架的核心功能和最佳实践。

## 功能特性

- ✅ Controller路由
- ✅ Middleware中间件
- ✅ Service服务层
- ✅ DTO数据验证
- ✅ Exception异常处理
- ✅ Aspect切面
- ✅ Plugin插件
- ✅ 静态资源服务
- ✅ 视图模板

## 项目结构

```
basic-app/
├── src/
│   ├── App.ts              # 应用入口
│   ├── aspect/             # 切面
│   ├── bootstrap/          # 启动配置
│   ├── config/             # 配置文件
│   ├── controller/         # 控制器
│   ├── dto/                # 数据传输对象
│   ├── exception/          # 自定义异常
│   ├── middleware/         # 中间件
│   ├── plugin/             # 插件
│   ├── resource/           # 资源文件
│   └── service/            # 服务层
├── static/                 # 静态资源
├── view/                   # 视图模板
└── package.json
```

## 快速开始

### 1. 安装依赖

在monorepo根目录执行：

```bash
pnpm install
```

### 2. 运行开发模式

```bash
# 方式1: 使用pnpm
cd examples/basic-app
pnpm dev

# 方式2: 使用VS Code调试
# 按F5启动调试，选择"Koatty Basic App"
```

### 3. 访问应用

应用启动后，访问：

```
http://localhost:3000
```

### 4. 构建生产版本

```bash
pnpm build
pnpm start
```

## API路由示例

### HTTP路由

```typescript
@Controller("/api")
export class IndexController {
  @GetMapping("/")
  async index() {
    return { message: "Hello Koatty!" };
  }
  
  @PostMapping("/users")
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }
}
```

### WebSocket路由

```typescript
@Controller("/", "ws")
export class WebSocketController {
  @WebSocket("/chat")
  async chat(ctx: KoattyContext) {
    // WebSocket处理逻辑
  }
}
```

## 配置文件

配置文件位于 `src/config/` 目录：

- `config.ts` - 应用配置
- `router.ts` - 路由配置
- `middleware.ts` - 中间件配置

## 调试

### VS Code调试

项目已配置VS Code调试支持，按F5即可启动调试。

调试配置位于根目录 `.vscode/launch.json`。

### 日志输出

应用使用 `koatty_logger` 输出日志：

```typescript
import { Logger } from "koatty_logger";

Logger.Info("这是一条信息日志");
Logger.Error("这是一条错误日志");
```

## 依赖说明

此示例使用workspace依赖，确保使用最新的koatty框架代码：

```json
{
  "dependencies": {
    "koatty": "workspace:*",
    "koatty_core": "workspace:*",
    "koatty_router": "workspace:*"
  }
}
```

## 相关链接

- [Koatty文档](https://github.com/koatty/koatty)
- [API文档](https://koatty.github.io/)
- [更多示例](../README.md)

## 许可证

BSD-3-Clause

