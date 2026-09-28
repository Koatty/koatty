# koatty

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
