# koatty-serverless MVP 分步构建任务

> **用法**：每次给工程 LLM 一个任务，完成并测试后再进行下一个。  
> **前置条件**：[CALLBACK_REFACTORING_PLAN.md](./CALLBACK_REFACTORING_PLAN.md) 已全部完成。  
> **MVP 范围**：`createHandler()` + 阿里云 FC 适配器 + 事件检测 + 生命周期管理 + 单元测试  
> **方案文档**：[SERVERLESS_IMPLEMENTATION_PLAN.md](./SERVERLESS_IMPLEMENTATION_PLAN.md)

---

## Task 1：创建 koatty-serverless 包骨架

**目标**：在 monorepo 中创建 `packages/koatty-serverless` 包，能够 `pnpm install` 和 `pnpm run build` 通过。

**操作**：

1. 创建目录 `packages/koatty-serverless/src/`
2. 创建 `packages/koatty-serverless/src/index.ts`，内容仅为一行占位导出：
   ```typescript
   export const VERSION = '1.0.0';
   ```
3. 创建 `packages/koatty-serverless/package.json`，参考 `packages/koatty-lib/package.json` 的结构：
   - name: `koatty_serverless`
   - version: `1.0.0`
   - description: `Serverless adapter for Koatty framework`
   - scripts: 与 koatty-lib 一致（build:js, build:dts, build:doc, build:cp, clean, lint, test）
   - main/types/exports: 标准 dual CJS/ESM 配置
   - engines: `node >= 18.0.0`
   - dependencies: `"koatty_core": "workspace:*"`
   - peerDependencies: `"koatty": "workspace:*"`, `"koatty_core": "workspace:*"`
   - devDependencies: 复用 monorepo 标准开发依赖（api-extractor, api-documenter, typescript-eslint, jest, ts-jest, tslib 等，版本号参考 koatty-lib）
4. 创建 `packages/koatty-serverless/tsconfig.json`，复制 koatty-lib 的，确保 `outDir: "./temp"`, `rootDir` 不设或为 `"./src"`
5. 创建 `packages/koatty-serverless/tsup.config.ts`，内容：
   ```typescript
   import { defineConfig } from "tsup";
   import { baseConfig } from "../../tsup.config.base";
   export default defineConfig({ ...baseConfig });
   ```
6. 创建 `packages/koatty-serverless/api-extractor.json`，复制 `packages/koatty-graphql/api-extractor.json`（它是最近新建的简洁版）
7. 创建 `packages/koatty-serverless/jest.config.js`，复制 koatty-lib 的
8. 创建 `packages/koatty-serverless/.eslintrc.js`，复制 koatty-lib 的
9. 创建 `packages/koatty-serverless/.versionrc.js`，复制 koatty-lib 的
10. 创建 `packages/koatty-serverless/LICENSE`，复制 monorepo 根目录的
11. 创建空目录 `packages/koatty-serverless/test/`

**验证**：
```bash
cd monorepo-root
pnpm install
cd packages/koatty-serverless
pnpm run build    # 应成功生成 dist/index.js, dist/index.mjs, dist/index.d.ts
pnpm run test     # 应通过（无测试用例，passWithNoTests）
```

**无破坏性变更。**

---

## Task 2：实现类型定义和 ServerlessAdapter 接口

**目标**：创建 `types.ts` 和 `adapters/adapter.ts`，定义所有公共类型。

**操作**：

1. 创建 `src/adapters/adapter.ts`，定义 `ServerlessAdapter` 接口：
   ```typescript
   import type { KoattyApplication } from 'koatty_core';
   
   export interface ServerlessAdapter {
     readonly name: string;
     createHandler(app: KoattyApplication): (...args: any[]) => Promise<any>;
   }
   ```
2. 创建 `src/types.ts`，定义 `Platform`、`EventHandler`、`CreateHandlerOptions` 类型。
   完整内容参考方案文档第三章 3.2 节。
3. 更新 `src/index.ts`，导出这些类型：
   ```typescript
   export type { CreateHandlerOptions, Platform, EventHandler } from './types';
   export type { ServerlessAdapter } from './adapters/adapter';
   ```

**验证**：
```bash
pnpm run build  # 编译通过，dist/index.d.ts 包含导出的类型
```

**无破坏性变更。**

---

## Task 3：实现 detectEventSource 事件检测 + 单元测试

**目标**：实现事件来源检测函数，这是一个纯函数，无外部依赖，最适合先实现和测试。

**操作**：

1. 创建 `src/event-detector.ts`，实现 `detectEventSource(event: any): string | null`。
   完整实现参考方案文档第三章 3.4 节。覆盖：
   - AWS CloudWatch Events / EventBridge → `'scheduled'`
   - 自定义 timer → `'scheduled'`
   - AWS SQS → `'sqs'`
   - AWS SNS → `'sns'`
   - AWS S3 → `'s3'`
   - 阿里云定时触发器 → `'scheduled'`
   - HTTP 事件（API Gateway v1/v2）→ `null`
   - 未知事件 → `event.triggerType || null`
   - null/非对象输入 → `null`

2. 更新 `src/index.ts`，添加导出：
   ```typescript
   export { detectEventSource } from './event-detector';
   ```

3. 创建 `test/event-detector.test.ts`，测试用例覆盖以下场景：
   - `null` / `undefined` / `'string'` / `123` → 返回 `null`
   - `{ source: 'aws.events' }` → 返回 `'scheduled'`
   - `{ 'detail-type': 'Scheduled Event' }` → 返回 `'scheduled'`
   - `{ source: 'serverless.timer' }` → 返回 `'scheduled'`
   - `{ triggerType: 'Timer' }` → 返回 `'scheduled'`
   - `{ triggerName: 'x', triggerTime: 'y' }` → 返回 `'scheduled'`
   - `{ Records: [{ eventSource: 'aws:sqs' }] }` → 返回 `'sqs'`
   - `{ Records: [{ EventSource: 'aws:sns' }] }` → 返回 `'sns'`
   - `{ Records: [{ eventSource: 'aws:s3' }] }` → 返回 `'s3'`
   - `{ httpMethod: 'GET' }` → 返回 `null`（HTTP 事件）
   - `{ requestContext: { http: { method: 'GET' } } }` → 返回 `null`（HTTP v2）
   - `{ headers: { host: 'example.com' } }` → 返回 `null`（HTTP）
   - `{ triggerType: 'custom-event' }` → 返回 `'custom-event'`
   - `{}` → 返回 `null`

**验证**：
```bash
pnpm run build
pnpm run test   # 所有 event-detector 测试通过
```

**无破坏性变更。**

---

## Task 4：实现 bindShutdownHook 生命周期管理 + 单元测试

**目标**：实现 Serverless 关闭处理，确保 SIGTERM 时触发 app 清理。

**操作**：

1. 创建 `src/lifecycle.ts`，实现 `bindShutdownHook(app: KoattyApplication): void`。
   完整实现参考方案文档第三章 3.5 节。要点：
   - 模块级 `shutdownBound` 标志防止重复绑定
   - 监听 `SIGTERM` 和 `SIGINT`
   - 调用 `app.stop?.()` 进行清理
   - 错误时 `console.error` 但不阻止退出

2. 导出一个 `resetShutdownState()` 函数（仅供测试用，不在 index.ts 中导出）：
   ```typescript
   /** @internal - 仅供测试使用 */
   export function resetShutdownState(): void {
     shutdownBound = false;
   }
   ```

3. 创建 `test/lifecycle.test.ts`，测试用例：
   - 调用 `bindShutdownHook(mockApp)` 后，`process.listenerCount('SIGTERM')` 应增加
   - 再次调用同一个 app，listener 数不应再增加（幂等）
   - mock `app.stop`，手动 emit `SIGTERM`，验证 `app.stop` 被调用
   - 测试前后用 `resetShutdownState()` 重置状态

   **注意**：测试中不要真正调用 `process.exit`，需要 mock 它：
   ```typescript
   const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
   ```

**验证**：
```bash
pnpm run build
pnpm run test   # lifecycle 测试通过
```

**无破坏性变更。**

---

## Task 5：实现阿里云 FC 适配器 + 单元测试

**目标**：实现最简单的适配器（直接透传 req/res），验证适配器模式可行。

**操作**：

1. 创建 `src/adapters/alicloud-fc.ts`，实现 `AliCloudFcAdapter`。
   完整实现参考方案文档第四章 4.2 节。要点：
   - `createHandler(app)` 内部调用 `app.getRequestHandler()` 获取 httpHandler
   - 返回的函数签名 `(req, resp, context?) => Promise<any>`
   - 将 `context` 挂载到 `req.fcContext`

2. 更新 `src/index.ts`，添加导出：
   ```typescript
   export { AliCloudFcAdapter } from './adapters/alicloud-fc';
   ```

3. 创建 `test/adapters/alicloud-fc.test.ts`，测试用例：
   - `adapter.name` 应为 `'alicloud-fc'`
   - `createHandler` 应返回一个函数
   - 调用返回的 handler(mockReq, mockRes, mockContext)，验证：
     - `app.getRequestHandler()` 被调用
     - httpHandler 被调用时传入了 mockReq 和 mockRes
     - `mockReq.fcContext === mockContext`
   - 不传 context 时，`mockReq.fcContext` 不应被设置

   **Mock 方式**：创建 mock app 对象：
   ```typescript
   const mockHttpHandler = jest.fn().mockResolvedValue(undefined);
   const mockApp = {
     getRequestHandler: jest.fn().mockReturnValue(mockHttpHandler),
     isReady: true,
   } as any;
   ```

**验证**：
```bash
pnpm run build
pnpm run test   # alicloud-fc 测试通过
```

**无破坏性变更。**

---

## Task 6：实现 createHandler 核心入口 + 单元测试

**目标**：实现 `createHandler` 统一入口函数，集成事件检测、生命周期管理、适配器调用。

**前置说明**：`createHandler` 内部调用 `createApplication()`（来自 `koatty` 包）。
单元测试中需要 mock 这个导入，避免真正执行框架 bootstrap。

**操作**：

1. 创建 `src/handler.ts`，实现 `createHandler(AppClass, options?)`。
   完整实现参考方案文档第三章 3.3 节。要点：
   - 返回一个 `async (...args) => Promise<any>` 函数
   - 闭包内 `cachedApp` 和 `cachedHandler` 做单例缓存
   - 首次调用：`createApplication(AppClass, bootFunc)` → `bindShutdownHook(app)`
   - 每次调用：`healthCheck(app)` → `detectEventSource` 事件路由 → 适配器处理

   **关于 `createApplication` 的导入**：
   由于 `koatty` 是 `peerDependency`，`handler.ts` 中 import 写法为：
   ```typescript
   import { createApplication } from 'koatty';
   ```
   但在单元测试中需要 mock。如果 jest mock `koatty` 模块有困难，
   可以改为注入式设计：`createHandler` 接受可选的 `_createApp` 参数（仅内部/测试用）：
   ```typescript
   export function createHandler(
     AppClass: any,
     options: CreateHandlerOptions = {},
     // 内部参数，方便测试注入
     _createApp?: typeof createApplication,
   ) { ... }
   ```

2. **adapterMap 注册**：目前 MVP 只有 alicloud 适配器已实现，aws 和 tencent 暂时 throw Error 提示未实现：
   ```typescript
   const adapterMap: Record<Platform, new () => ServerlessAdapter> = {
     alicloud: AliCloudFcAdapter,
     aws: class NotImplemented implements ServerlessAdapter {
       readonly name = 'aws-lambda';
       createHandler() { throw new Error('AWS Lambda adapter not yet implemented. Use platform: "alicloud" or provide a custom adapter.'); }
     },
     tencent: class NotImplemented implements ServerlessAdapter {
       readonly name = 'tencent-scf';
       createHandler() { throw new Error('Tencent SCF adapter not yet implemented. Use platform: "alicloud" or provide a custom adapter.'); }
     },
   };
   ```

3. 更新 `src/index.ts`，添加导出：
   ```typescript
   export { createHandler } from './handler';
   ```

4. 创建 `test/handler.test.ts`，测试用例：

   a. **冷启动：首次调用初始化 app 并缓存**
      - mock `createApplication` 返回 mockApp
      - 调用 handler 一次 → `createApplication` 被调用 1 次
      - 调用 handler 第二次 → `createApplication` 仍然只被调用 1 次（缓存生效）

   b. **healthCheck 每次调用都执行**
      - 配置 `healthCheck: mockFn`
      - 调用 handler 两次 → `mockFn` 被调用 2 次

   c. **事件路由：非 HTTP 事件分发到 eventHandlers**
      - 配置 `eventHandlers: { scheduled: mockScheduledFn }`
      - 传入 `{ source: 'aws.events' }` 事件
      - 验证 `mockScheduledFn` 被调用，适配器 handler 未被调用

   d. **HTTP 事件走适配器**
      - 传入 `{ httpMethod: 'GET', path: '/' }` 事件
      - 验证适配器的 handler 被调用

   e. **自定义适配器优先于 platform**
      - 配置 `adapter: customAdapter`
      - 验证 `customAdapter.createHandler` 被调用，而非 adapterMap 中的默认适配器

**验证**：
```bash
pnpm run build
pnpm run test   # 全部测试通过
```

**无破坏性变更。**

---

## Task 7：实现 AWS Lambda 适配器 + 单元测试

**目标**：实现 AWS Lambda 适配器，使用 `@codegenie/serverless-express`。

**操作**：

1. 在 `packages/koatty-serverless/package.json` 的 `optionalDependencies` 中添加：
   ```json
   "@codegenie/serverless-express": "^4.x"
   ```
   运行 `pnpm install`。

2. 创建 `src/adapters/aws-lambda.ts`，实现 `AwsLambdaAdapter`。
   完整实现参考方案文档第四章 4.1 节。要点：
   - 延迟 `require('@codegenie/serverless-express')` — 不在模块顶层 import
   - 若 require 失败，throw 明确的安装提示错误
   - `context.callbackWaitsForEmptyEventLoop = false`

3. 更新 `src/handler.ts`，将 adapterMap 中 `aws` 的占位替换为真实的 `AwsLambdaAdapter`：
   ```typescript
   import { AwsLambdaAdapter } from './adapters/aws-lambda';
   // ...
   aws: AwsLambdaAdapter,
   ```

4. 更新 `src/index.ts`，添加导出：
   ```typescript
   export { AwsLambdaAdapter } from './adapters/aws-lambda';
   ```

5. 创建 `test/adapters/aws-lambda.test.ts`，测试用例：
   - `adapter.name` 应为 `'aws-lambda'`
   - mock `require('@codegenie/serverless-express')` 返回一个 mock 函数
   - `createHandler(mockApp)` 应调用 `serverlessExpress({ app: mockApp })`
   - 返回的 handler 调用时设置 `context.callbackWaitsForEmptyEventLoop = false`
   - 当 `@codegenie/serverless-express` 未安装时（mock require 抛出），应 throw 包含安装提示的错误

**验证**：
```bash
pnpm run build
pnpm run test   # aws-lambda 测试通过
```

**⚠️ 潜在兼容性问题**：

`@codegenie/serverless-express` 内部调用 `app.callback()` 获取 handler。
如果 Koatty 的 `callback()` 返回的 `Promise` 类型与 serverless-express 预期不符，
可能需要用方案文档中提到的 **备选方案 B**：

```typescript
const handler = app.getRequestHandler();
const wrappedApp = { callback: () => handler };
this.handler = serverlessExpress({ app: wrappedApp as any });
```

**如果遇到此问题**：在 `AwsLambdaAdapter.createHandler()` 中改用方案 B，
并在代码注释中说明原因。

---

## Task 8：实现腾讯云 SCF 适配器 + 单元测试

**目标**：实现腾讯云 SCF 适配器，将 API Gateway 事件转为模拟 HTTP req/res。

**操作**：

1. 创建 `src/adapters/tencent-scf.ts`，实现 `TencentScfAdapter` 和内部的 `createMockHttpPair`。
   完整实现参考方案文档第四章 4.3 节。要点：
   - 使用 `new IncomingMessage(new Socket())` 创建 mock req
   - 设置 req.method, req.url, req.headers
   - 通过 `req.push(body)` + `req.push(null)` 写入 body
   - 拦截 `res.write` 和 `res.end` 捕获输出
   - 在 `res.end` 时 resolve promise 为 API Gateway 响应格式

2. 更新 `src/handler.ts`，将 adapterMap 中 `tencent` 的占位替换为真实的 `TencentScfAdapter`。

3. 更新 `src/index.ts`，添加导出：
   ```typescript
   export { TencentScfAdapter } from './adapters/tencent-scf';
   ```

4. 创建 `test/adapters/tencent-scf.test.ts`，测试用例：

   a. **adapter.name** 应为 `'tencent-scf'`

   b. **基本 GET 请求转换**：
      - 事件：`{ httpMethod: 'GET', path: '/api/users', headers: { 'Content-Type': 'application/json' } }`
      - 验证 mock httpHandler 收到的 req：`method === 'GET'`, `url === '/api/users'`

   c. **带 query string 的请求**：
      - 事件：`{ httpMethod: 'GET', path: '/search', queryString: { q: 'hello', page: '1' } }`
      - 验证 req.url 包含 `?q=hello&page=1`

   d. **POST 请求带 body**：
      - 事件：`{ httpMethod: 'POST', path: '/api/data', body: '{"name":"test"}', headers: {} }`
      - 验证 body 被正确写入 req

   e. **Base64 编码 body**：
      - 事件：`{ httpMethod: 'POST', body: 'aGVsbG8=', isBase64Encoded: true }`
      - 验证解码后 body 为 `'hello'`

   f. **响应格式**：
      - mock httpHandler 中调用 `res.statusCode = 200; res.end('OK')`
      - 验证 promise resolve 的结果为 `{ statusCode: 200, body: 'OK', headers: {...}, isBase64Encoded: false }`

   g. **context 挂载**：
      - 验证 `req.scfContext === mockContext`

   **Mock httpHandler 实现示例**：
   ```typescript
   const mockHttpHandler = jest.fn((req, res) => {
     res.statusCode = 200;
     res.setHeader('content-type', 'text/plain');
     res.end('OK');
   });
   ```

**验证**：
```bash
pnpm run build
pnpm run test   # tencent-scf 测试通过
```

**无破坏性变更。**

---

## Task 9：完整构建验证 + README

**目标**：确保整个包构建成功，类型声明完整，并编写基本 README。

**操作**：

1. 运行完整构建并验证产物：
   ```bash
   cd packages/koatty-serverless
   pnpm run clean && pnpm run build
   ```
   检查 `dist/` 包含：
   - `index.js` (CJS)
   - `index.mjs` (ESM)
   - `index.d.ts` (类型声明)
   - `package.json` (路径已修正)

2. 检查 `dist/index.d.ts` 是否导出了所有公共 API：
   - `createHandler`
   - `CreateHandlerOptions`, `Platform`, `EventHandler` (类型)
   - `ServerlessAdapter` (类型)
   - `AwsLambdaAdapter`, `AliCloudFcAdapter`, `TencentScfAdapter` (类)
   - `detectEventSource` (函数)

3. 运行全量测试：
   ```bash
   pnpm run test
   ```

4. 创建 `packages/koatty-serverless/README.md`，内容包括：
   - 包名和简介
   - 安装方式 (`npm install koatty_serverless`)
   - Quick Start 示例（三个平台各一个）
   - 不使用 koatty-serverless 的最简方式
   - API 参考（createHandler 的 options 说明）
   - 自定义适配器示例
   - License

   示例内容直接引用方案文档第六章的代码。

**验证**：
```bash
pnpm run build   # 成功
pnpm run test    # 全部通过
ls dist/         # 确认产物完整
```

**无破坏性变更。**

---

## Task 10：koatty-core 和 koatty 包编译回归验证

**目标**：确保新增的 koatty-serverless 包不影响其他包的构建和测试。

**操作**：

1. 在 monorepo 根目录运行全量构建：
   ```bash
   pnpm run build    # 或 turbo run build
   ```
   确认所有包构建成功。

2. 运行 koatty-core 的测试：
   ```bash
   cd packages/koatty-core && pnpm run test
   ```

3. 运行 koatty 的测试：
   ```bash
   cd packages/koatty && pnpm run test
   ```

4. 运行 koatty-router 的测试：
   ```bash
   cd packages/koatty-router && pnpm run test
   ```

5. 如果有任何失败，排查是否与 CALLBACK_REFACTORING_PLAN 的改动有关，
   还是与 koatty-serverless 的新增有关。

**验证**：所有现有包构建和测试通过。

**无破坏性变更。**

---

## 任务依赖图

```
Task 1 (包骨架)
  ↓
Task 2 (类型定义)
  ↓
Task 3 (事件检测) ─────┐
  ↓                     │
Task 4 (生命周期) ──────┤
  ↓                     │
Task 5 (阿里云适配器) ──┤
  ↓                     │
Task 6 (createHandler) ←┘  ← 依赖 Task 3/4/5
  ↓
Task 7 (AWS 适配器) ──┐
  ↓                    │
Task 8 (腾讯云适配器) ─┤
  ↓                    │
Task 9 (构建 + README) ←┘
  ↓
Task 10 (回归验证)
```

> Task 3/4/5 相互独立，可按任意顺序执行（但都在 Task 2 之后、Task 6 之前）。
> Task 7/8 相互独立，可按任意顺序执行。

---

## 超出 MVP 范围（后续迭代）

以下内容不在本任务列表中，留待 MVP 完成后的后续迭代：

- [ ] NoopServer 可选优化（在 koatty-serve 中实现）
- [ ] 显式组件注册模式（`@Components` 装饰器）
- [ ] esbuild 打包配置示例
- [ ] 冷启动 Benchmark 测试
- [ ] 集成测试（模拟真实 Lambda/FC 运行时）
- [ ] E2E 测试（部署到真实云平台）
- [ ] 示例项目（`examples/serverless-aws/` 等）
- [ ] 部署指南文档（SAM/CDK/Serverless Framework）
