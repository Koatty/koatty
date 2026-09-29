# mcp-order-service — Phase F 参考应用

两个只读订单工具、一个 scope + 人工审批保护的退款工具、一个 URI 模板资源，以及通过流式工具循环回答的 `/ask` SSE 接口。使用真实 Koatty、独立容器、MCP SDK、Guard 和 GenAI recorder；订单数据仍是内存演示数据。

## 在本仓库运行

先完成递归子模块检出和依赖安装，所有命令在仓库根目录执行：

```sh
pnpm build:base
pnpm --filter @koatty/example-mcp-order-service... build
pnpm --filter @koatty/example-mcp-order-service start
```

启动前通过环境注入配置，不将真实凭据写进源码或日志：

| 键名 | 类型/用途 |
|---|---|
| MCP_API_KEYS | JSON 对象，键为凭据、值为 scope 字符串数组；必须非空 |
| LLM_MODE | 可选的本地 mock 模式选择；mock 不访问外部 provider |
| LLM_BASE_URL | 远端兼容 API 地址 |
| LLM_PROVIDER_TOKEN | 远端 provider 凭据 |
| LLM_MODEL | provider 模型 ID |
| HOST / PORT | HTTP 监听地址/端口；默认仅监听 loopback |

远端模式需要设置匹配供应商的模型和凭据。本地 mock 通过代码中的明确模式值选择；自动验收脚本会自行注入合成配置，无需真实凭据：

```sh
pnpm test:phase-f:compiled
```

## 接口与安全边界

- `/mcp`：Streamable HTTP；使用 `x-api-key` 认证，发现/读取/无 scope 的工具同样要求认证。
- `/ask`：POST JSON `{ question: string }`，长度上限由入口检查；认证后通过 `streamSSE` 输出，真实断线传递到 provider 和工具 invoker。
- `/approvals`：GET 当前进程待审批票据；`/approvals/{id}` 接受 POST `{ approved: boolean }`，均需 `approval:manage` scope。调用退款还需要 `order:refund`。批准是单次消费，不能重放。
- `/healthz`、`/readyz`：进程存活/本地初始化；readiness 不证明外部 provider 可访问。
- 参数化资源使用 `resources/templates/list` 发现；工具 DTO 自动导出 schema。
- 模型只获得 `order_query`、`order_list`；每轮出站消息（包含工具结果）检查、限流、脱敏。退款不交给模型。
- 工具通过 Guard 组合切面服务执行，审计输出摘要；每个实际 provider 尝试有 live span。默认不记录提示词原文。生产要配置 OpenTelemetry SDK/exporter 才能导出 span。

## 自动验证与证据边界

本例已纳入 pnpm workspace，根 `pnpm test` / CI 会执行。手动聚焦检查：

```sh
pnpm --filter @koatty/example-mcp-order-service test
pnpm --filter @koatty/example-mcp-order-service test:tsc
pnpm test:phase-f:compiled
```

13 个集成用例覆盖内存 MCP 协议、真实 Koatty HTTP/SSE、socket 断线、实际流式工具循环、Guard 出站脱敏与注入拒绝，以及工具内部调用 LLM 的真实 parent span ID。provider 是离线脚本，不是远端服务验收。MCP 包另测 stateful/stateless 各两个官方 SDK HTTP 客户端。

## 部署

Docker 从仓库根目录构建，使用 `deploy/Dockerfile` 的完整相对路径；必须包含子模块源码。启动配置由环境/Secret 注入。Kubernetes 模板的镜像名和模型配置需由部署方提供。

示例的订单、审批与限流是单进程内存实现，因此模板为单副本；需要多副本时，先替换持久业务存储和带原子 CAS 的审批后端。`guard.approval.resume` 只恢复等待，不会自动重放业务操作。

## 人工与外部验收

尚未在本次执行：Inspector + 至少两个主流 MCP 客户端、真实 provider、真实 Redis/进程恢复、Docker/Kubernetes 和隔离发布包安装。人工验收应分别确认认证发现、DTO 错误、scope 拒绝、审批允许/拒绝/超时、SSE 断连和导出的父子 trace。

主仓库 `docs/phase-f-repair-2026-09-29.md` 与 `docs/migration/phase-f-audit-fixes.md` 记录逐项修复和迁移契约。
