# mcp-order-service（Phase F 参考应用 / F-5）

一个把 Phase F 的四个能力组装到一起的参考应用：

| 能力 | 包 | 在本例中的落点 |
|---|---|---|
| F-1 MCP Server 宿主 | `koatty_mcp` | `src/tools/OrderTools.ts`（`@Tool` / `@Resource`）+ `src/app.ts` 里的 `createMcpHost` / `createMcpHttpAdapter` |
| F-2 LLM 调用抽象 | `koatty_llm` | `src/agent/SupportAgent.ts`（流式 + 工具引用）、`src/controller/AskController.ts`（SSE 输出、取消传递） |
| F-3 AI 护栏 | `koatty_guard` | `src/app.ts` 里的 `createGuard`：审批、脱敏、内容检查、限流、审计 |
| F-4 GenAI 可观测性 | `koatty_trace` | `src/tracing.ts`（`gen_ai.*` span + 审计桥接） |

它同时是 F-1～F-4 的集成测试宿主：`test/regression/F-05.reference-app.test.ts` 通过**真实 MCP 协议**（in-memory transport）与脚本化供应商离线跑完整链路，共 11 例。

## 目录结构

```
src/
  app.ts                     # 组装入口：createOrderServiceApp()（本文件的唯一"公开 API"）
  tracing.ts                 # createAuditSink()：把 koatty_guard 审计事件与 GenAI span 串到一条 trace
  dto/QueryOrderDto.ts       # 只读工具入参（@Validated types 来源）
  dto/RefundDto.ts           # 写工具入参
  dto/AskDto.ts              # /ask 入参
  service/OrderService.ts    # 业务逻辑（工具只做参数解析与委派）
  tools/OrderTools.ts        # 2 个只读工具 + 1 个需审批的写工具 + 1 个 Resource
  agent/SupportAgent.ts      # LLM 流式问答，只允许引用只读工具
  controller/AskController.ts# /ask：SSE 流式输出，透传 ctx.signal
test/regression/F-05.reference-app.test.ts
deploy/Dockerfile            # 部署模板（嵌入方应用）
deploy/k8s.yaml              # Kubernetes 探针/安全上下文模板
```

## 默认安全姿态

| 项 | 默认值 | 说明 |
|---|---|---|
| 鉴权 | `createApiKeyAuth({ keys })`，key → scopes | `order_refund` 需要 `order:refund`，否则**在业务方法执行前**被拒绝 |
| 审批 | `refund` 工具 `requireApproval: true` | 审批后端静默 → 超时自动拒绝（fail closed），工具永不执行 |
| 内容检查 | `guard.content.inspect()` | 只拦截已知注入特征；**不是唯一防线** |
| 审计 | 脱敏后的入参摘要 + 状态 + 耗时 | 写工具被挂起/拒绝也会留痕 |
| Trace | 默认**不记录**提示词与模型输出原文 | 需要显式 `captureContent: true` 才开启，开启后走同一脱敏服务 |
| 模型可见的工具 | `['order_query', 'order_list']` | 写工具从不交给模型自主调用 |

## 运行测试

```bash
# 在仓库根目录
cd packages/koatty
pnpm test:example                                                              # 11 例
npx jest --config examples/mcp-order-service/jest.config.js --coverage=false   # 等价写法
cd examples/mcp-order-service && npx tsc -p tsconfig.json --noEmit            # 类型检查
```

> 该用例不进入 `koatty` 包自身的 `jest` 匹配范围（`testMatch` 只看 `packages/koatty/test/**`），因此单独提供 `test:example` 脚本；仓库的 `pnpm test` 行为不变。

## 在真实 Koatty 应用里挂载

`createOrderServiceApp()` 不启动服务器，它只做组装，挂载方式与普通中间件一致：

```ts
import { ExecBootStrap } from 'koatty';
import { Koatty } from 'koatty_core';
import { createGuard } from 'koatty_guard';
import { createGenAiRecorder } from 'koatty_trace';
import { createLlmClient } from 'koatty_llm';
import { createOrderServiceApp } from './src/app';
import './src/tools/OrderTools'; // 装饰器必须先于发现执行

class App extends Koatty {
  async bootstrap() {
    // 1) 从配置构造四个能力（这里只写出关键项）
    const guard = createGuard({ app: this, auditSink: (r) => this.audit(r) });
    const llm = createLlmClient(this.config('llm'));
    const genai = createGenAiRecorder({ tracer: this.tracer });

    // 2) 组装：MCP 宿主 + 参考应用
    const { mcp, ask } = createOrderServiceApp({
      app: this, llm, guard, genai,
      security: { auth: myAuth, strict: true, approvalTimeoutMs: 30_000 },
    });

    // 3) 挂在既有 HTTP 服务上：/mcp 只在显式挂载处可达
    this.use(mcp.middleware);
  }
}
await ExecBootStrap()(App);
```

- `/ask`（`src/controller/AskController.ts`）用 `@GetMapping('/ask')` 之类的既有路由入口暴露，方法体内调用 `ask.ask(ctx)`；`ctx.signal` 由 Serve 提供，客户端断开即取消供应商请求。
- 本地调试可直接用 stdio：`await startStdioServer(host, { identity: { name: 'local', scopes: ['order:refund'] } })`。**stdio 默认是匿名身份**，不显式给 identity 时 scope 工具一律拒绝——这是刻意设计，避免"绕过 HTTP 就绕过权限"。
- 生产不要用 stdio；HTTP 模式的 `Origin` 校验默认只允许回环地址，跨域客户端需要显式 `allowedOrigins`。

## 部署（Docker + Kubernetes）

`deploy/` 下是**嵌入方应用**的模板：本示例是可被 import 的组装模块，镜像要构建的是你自己的 Koatty 应用（它 `use` 了 `mcp.middleware`）。

- `deploy/Dockerfile`：多阶段构建、非 root（`node` 用户）、`NODE_ENV=production`，只拷贝 `dist` 与生产依赖，`HEALTHCHECK` 打 `/healthz`。
- `deploy/k8s.yaml`：`livenessProbe` → `/healthz`，`readinessProbe` → `/readyz`，`startupProbe` 放宽冷启动；`runAsNonRoot`、`readOnlyRootFilesystem`、丢弃全部 capability；`terminationGracePeriodSeconds` 留出 SSE 排空时间；`HOST` 默认 `127.0.0.1`（本地模式），容器里显式设置为 `0.0.0.0`。

探针端点建议直接复用既有路由：

```ts
app.get('/healthz', (ctx) => { ctx.body = 'ok'; });              // 进程存活
app.get('/readyz', (ctx) => { ctx.body = mcpReady ? 'ready' : 'not ready'; });
```

## 人工验收（需要真实客户端）

以下两条属于"需要人工在真实客户端确认"的验收项，自动回归无法替代：

1. **MCP Inspector**：`npx @modelcontextprotocol/inspector`，Transport 选 Streamable HTTP，URL `http://127.0.0.1:3000/mcp`，Header 加 `Authorization: Bearer <key>`。
   期望：`tools/list` 返回 3 个工具（`order_query`、`order_list`、`order_refund`），`resources/list` 返回订单资源模板；用 `read-key` 调 `order_refund` → `isError`（缺 scope）；用 `refund-key` 调用 → 若审批后端无人处理则超时拒绝，批准后才返回业务结果。
2. **第二个客户端**（Cursor / Claude Code）：同样以 Streamable HTTP 接入，重复 `order_query` 调用，确认参数里的未声明字段被剥离、非法参数返回 JSON-RPC 错误而不是抛异常。

## 已知限制

- 内容检查基于规则，只能拦截已知模式；真正的边界是 scope + 人工审批（见 F-1/F-3 设计说明）。
- 示例的 mock 供应商用于离线验证；接真实供应商时请通过 `koatty_llm` 的 `routes` 配置映射逻辑模型名。
- `deploy/` 是模板，未在本仓库内构建镜像；模板中不包含任何密钥，配置一律来自环境变量。
