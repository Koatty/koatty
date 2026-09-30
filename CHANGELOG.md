## Unreleased — Phase A–F review (2026-09-30)

## 5.0.0

### Major Changes

- f0e9278: Phase A–D 审计修复，未发布：

  - 容器注册表、类标识、实例注入与 AOP 解析均按容器隔离；注入不再写入共享原型。同名构造函数的元数据缓存不再串用。
  - `app.container` 与 Core ALS 贯通；请求结束释放对应容器的请求实例。组件实例和事件处理器使用所属应用。
  - 注册期构造路由 handler；控制器、参数元数据、中间件和 RouterFactory 使用应用容器。关闭一个应用不会清理另一应用的路由。
  - 扫描目录、每个模块与缓存条目均以 realpath 校验根目录边界；越界路径直接拒绝，不再回退扫描整个项目。
  - Bootstrap 自动创建应用独立容器，Loader/Router/注入链路使用 app.container；扫描同时处理默认导出与具名导出。
  - SSE 复用普通路由和 streamSSE；现有 middleware 与 Around/run 承担鉴权、限流和方法包装。
  - HTTPS/HTTP2 证书热更新及失败回退。
  - Serve 使用连接追踪器，HTTP/3 移至独立实验包 koatty_http3；移除核心 QUIC 依赖及模拟监听。
  - 生产构建可用既有 manifest 命令生成 runtime 清单；启动前逐文件校验路径与 SHA256。
  - 修复独立安装缺失运行时/公开类型依赖，以及原生 Node ESM 入口加载错误。
  - Config 复用既有双模式装饰器适配器，支持 TC39 字段初始化与应用隔离。

  移除 Http3Server 等核心导出和入站池语义属于破坏性变更，因此 koatty 与 koatty_serve 必须按 major 发布，不能沿用原计划的 4.5.0 minor。koatty_http3 是首次发布包，按发布工具的新包流程单独处理；最终版本需与主包依赖同步。

  迁移：docs/migration/phase-d-router-hotpath.md。D-5 实现及 D-7 清单已补齐；性能门槛、Linux CI 与部署验收仍未关闭。此文件不代表验收通过，不自动应用版本或发布。

### Patch Changes

- f0e9278: Close the second Phase A–F review: strict security config validation and environment resolution, explicit metrics trust, default WS Origin checks, hard-link-safe CLI writes and delimited tool arguments, DTO transformation and conservative schema diagnostics, privacy-safe telemetry, HTTP3 peer ownership and draining reference SSE service. MCP/LLM/Guard first-release major entries are in phase-f-audit-hardening. See docs/migration/phase-a-f-review-fixes.md. Do not treat local tests as release/client/provider acceptance.
- f0e9278: Close Phase C audit findings: await singleton initialization and reverse disposal, make shutdown idempotent and drain responses complete, handle real gRPC deadlines and stream termination, bound lock renewal with cooperative cancellation, await scheduler drain, validate JSON Schema and explicit security profiles, isolate Redis native leases/transactions, and preserve cached types with single flight.

  Redis transactions now return an explicit isolated handle; native connections must be released. Untyped legacy cache entries are treated as misses. JSON Schema requires optional peer ajv 8. See docs/migration/phase-c-audit-remediation.md before release. Linux/Redis CI and independent package consumption remain release gates.

- Updated dependencies [f0e9278]
- Updated dependencies [f0e9278]
- Updated dependencies [f0e9278]
- Updated dependencies [f0e9278]
- Updated dependencies [a9e91a9]
- Updated dependencies [f0e9278]
- Updated dependencies [f0e9278]
  - koatty_core@2.7.0
  - koatty_serve@4.0.0
  - koatty_trace@2.5.0
  - koatty_config@1.5.0
  - koatty_container@4.1.0
  - koatty_lib@1.6.1
  - koatty_loader@2.1.0
  - koatty_logger@3.1.2
  - koatty_router@2.5.0
  - koatty_exception@2.2.3

Reference app emits safe SSE errors, drains active responses before shutdown and reports readiness; avoid duplicate guard audits; add socket/backpressure regressions and exclude examples from published files.

Migration: `docs/migration/phase-a-f-review-fixes.md` in the monorepo. No release has been applied.

# koatty

## Unreleased — Phase F audit fixes (2026-09-29)

- MCP 参考应用接入真实 SSE、流式工具循环、Guard、live trace；新增真实 HTTP/断线/链路测试及可构建启动入口，纳入 workspace 与 CI。
- 迁移说明：`docs/migration/phase-f-audit-fixes.md`（主仓库）。

## Unreleased — Phase A–D completion

- appStart 在所有传输真正监听后触发一次，appReady 仅表示初始化完成；createApplication 不提前发出 appStart。
- 生产启动消费经过路径与 SHA256 校验的 runtime manifest；内置配置直接打包，修复 tarball 中缺少 config 目录的启动失败。
- 修复无脚本 argv 的嵌入启动及 ESM 类型导出；生成项目采用编译后清单构建流程。

本轮尚未发布；验收边界见根目录 `docs/audits/phase-ad-completion-2026-09-28.md`。

## Unreleased (Phase A–D remediation)

- Bootstrap 自动创建应用独立容器，Loader/Router/注入链路使用 app.container；扫描同时处理默认导出与具名导出。
- Loader 尊重 Service scope/args，Controller 在实际请求中构造，避免启动阶段解析 Request 依赖。
- 应用停止刷新共享默认日志器；最后一个配置日志的应用停止后关闭批量刷新定时器，不销毁其他应用仍使用的进程级日志资源。
- Jest 中导入 Bootstrap 类只登记定义，显式 createApplication/ExecBootStrap 才启动，避免测试产生无法管理的后台应用；生产自动启动不变。
- app.paths 为路径入口；旧 env 路径写入保留兼容、已弃用。阶段发布仍受 D-5/D-7 等未关闭验收项约束。

迁移说明：`docs/migration/phase-d-router-hotpath.md`。尚未发布。

## 4.4.0

### Minor Changes

- Phase C（P1 功能正确性）发布：优雅停机闭环（COR-03）、gRPC 四种调用形态（COR-04）、
  中间件栈失效修复（COR-12）、Trace 每请求只记账一次（COR-15），
  依赖 koatty_serve@3.5.0 / koatty_trace@2.4.0 / koatty_core@2.5.0。

## 4.3.3

### Patch Changes

- Updated dependencies
  - koatty_core@2.4.0
  - koatty_router@2.4.0
  - koatty_serve@3.4.0
  - koatty_logger@3.1.0
  - koatty_config@1.4.2
  - koatty_trace@2.3.2
  - koatty_container@4.0.0
  - koatty_exception@2.2.2

## 4.3.2

### Patch Changes

- Updated dependencies
  - koatty_trace@2.3.1

## 4.3.1

### Patch Changes

- Updated dependencies
  - koatty_loader@2.0.1
  - koatty_router@2.3.1
  - koatty_config@1.4.1

## 4.3.0

### Minor Changes

- Phase B security hardening (koatty-hardening-and-ai-evolution-plan.md, ADR-101/102/103). Fail-closed defaults with a `security.legacyDefaults: true` rollback switch; see docs/migration/4.3.0.md for the full migration guide.

  Highlights:

  - SecurityProfile (strict/standard/development) exposed read-only as `app.security`, with a startup summary and per-item WARN when rolling back
  - body parsing failures return 400/413/415 instead of silently producing `{}`; body size limit follows the security profile (1mb in production)
  - DTO validation whitelist on by default (strict profile rejects unknown fields); `__proto__`/`constructor` keys never reach DTO instances
  - AOP aspect failures abort the business method unless opted out via `{ onError: 'log' }` or `app.security.aop.onAspectError`
  - After/AfterEach aspects receive the business result via `options.result`
  - GraphQL: profile-driven playground/introspection/depth limits, built-in depth rule, optional complexity package fails startup when configured but missing, CDN-free GraphiQL
  - uploads: profile-driven maxFiles/maxFields/maxFieldsSize, keepExtensions defaults off, array-aware temp cleanup, new `safeFilename` export
  - ops endpoints: minimal liveness body, /ready 503 while draining, /metrics behind the exposeMetrics policy (loopback/RFC1918/allowCidrs/token), Prometheus bound to 127.0.0.1, rateLimit middleware wired (default off)
  - request IDs validated (`[A-Za-z0-9._:-]{1,128}`), query fallback disabled, structured access logs, topology service header opt-in
  - WebSocket: profile maxPayload, perMessageDeflate off, Origin check, connection limits, error-message redaction, slow-consumer guard, timer cleanup on destroy
  - TLS minVersion TLSv1.2 by default; TypeORM production logs errors only with sensitive-parameter redaction; Swagger disabled in production by default
  - defect fixes: escapeHtml (&-escaping, valid entities), ReDoS-safe isNumberString, plugin run() executes once, bootstrap failures propagate, Redis default port 6379, gRPC ListServices, koatty_cli bin (CJS build), RedLocker.resetInstance, config() write loss, CLI sandbox + `apply` dry-run by default

### Patch Changes

- Updated dependencies
  - koatty_core@2.3.0
  - koatty_router@2.3.0
  - koatty_serve@3.3.0
  - koatty_trace@2.3.0
  - koatty_config@1.4.0
  - koatty_container@3.0.0
  - koatty_lib@1.6.0
  - koatty_exception@2.2.1
  - koatty_loader@2.0.0
  - koatty_logger@3.0.0

## 4.2.0

### Minor Changes

- build
- build

### Patch Changes

- Updated dependencies
- Updated dependencies
  - koatty_exception@2.2.0
  - koatty_config@1.3.0
  - koatty_router@2.2.0
  - koatty_serve@3.2.0
  - koatty_trace@2.2.0
  - koatty_core@2.2.0
  - koatty_container@3.0.0
  - koatty_lib@1.5.0
  - koatty_loader@2.0.0
  - koatty_logger@3.0.0
