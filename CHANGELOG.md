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
