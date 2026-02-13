# Koatty Callback 优化与 Serverless 基础改造方案

> **状态**: 待评审  
> **作者**: AI 辅助分析  
> **日期**: 2026-02-13  
> **关联文档**: [SERVERLESS_IMPLEMENTATION_PLAN.md](./SERVERLESS_IMPLEMENTATION_PLAN.md)

---

## 一、背景与分析结论

通过对 `packages/koatty-core`、`packages/koatty-serve`、`packages/koatty-router` 核心组件的深度代码审查，
确认 **`app.callback()` 确实返回 `(req, res) => Promise<void>` 标准 Node.js HTTP 请求处理器**，
与 Koa 兼容，中间件和控制器处理逻辑正确挂载。但发现以下三个问题：

### 问题 1：`callback()` 每次请求都重新 Compose（性能问题）

**严重程度**: 中等

`koatty-serve` 的所有协议服务器（HTTP、HTTPS、HTTP/2、HTTP/3、WebSocket、gRPC）均在**每个请求**
中调用 `this.app.callback()`：

```typescript
// packages/koatty-serve/src/server/http.ts:44-45
(this as any).server = createServer((req, res) => {
    this.app.callback()(req, res);  // ← 每次请求都调用
});
```

而 `callback()` 内部每次都会执行 `koaCompose()`：

```typescript
// packages/koatty-core/src/Application.ts:534-535
const fn = koaCompose(protocolMiddleware as any);  // ← 每次都重新组合
```

**对比 Koa 标准做法**：Koa 在 `listen()` 中只调用一次 `callback()`，返回的 handler 被所有请求复用。

**影响范围**：`http.ts`、`https.ts`、`http2.ts`、`http3.ts`、`ws.ts`、`grpc.ts` —— 全部协议。

### 问题 2：Payload 中间件在路由之后且对已匹配路由不可达

**严重程度**: 低（已有 workaround，但语义不正确）

中间件栈 `this.middleware` 的注册顺序（由生命周期事件时序决定）：

| 顺序 | 阶段 | 中间件 |
|:----:|------|--------|
| 1 | `loadMiddleware` | Trace 链路追踪 |
| 2 | `loadMiddleware` | 用户自定义中间件 |
| 3 | `loadRouter` | 路由中间件 (`router.routes()` + `allowedMethods()`) |
| 4 | `appReady` | **Payload 解析中间件** ← 在路由之后 |

由于路由 handler 不调用 `next()`（参考 `HttpRouter.LoadRouter` 中注册的 `implementation` 函数），
在 Koa 洋葱模型中，第 4 层 payload 中间件**永远不会被已匹配路由执行到**。

当前的 workaround 是 `strategy-extractor.ts` 直接导入并调用 `bodyParser()` 函数：

```typescript
// packages/koatty-router/src/utils/strategy-extractor.ts:21
import { bodyParser } from "../payload/payload";
// ...
const parsedBody = await bodyParser(ctx, params[0]?.options);
```

虽然功能正常，但中间件语义被破坏，`ctx.requestBody()`、`ctx.requestParam()` 等便捷方法在路由 handler
 中不可用（因为 `Helper.define()` 未在 payload 中间件中执行过）。

### 问题 3：`callback()` 签名与 Koa 不完全一致

**严重程度**: 低

| 框架 | 签名 |
|------|------|
| **Koa** | `callback(): (req: IncomingMessage, res: ServerResponse) => void` |
| **Koatty** | `callback(protocol?: string, reqHandler?): (req: RequestType, res: ResponseType) => Promise<any>` |

虽然默认参数确保了行为兼容（`app.callback()` 无参调用等价于 `app.callback("http")`），
但类型签名不同可能影响第三方库（如 `supertest`）的类型推断。

---

## 二、设计原则

1. **向后兼容**：所有现有 API 保持不变，现有项目零改动即可升级
2. **最小侵入**：每个改动精确定位到具体方法，不重构整体架构
3. **独立可测**：四个改动相互独立，可逐个合入、逐个测试
4. **渐进增强**：修复本身即优化，同时为 Serverless 打好基础

---

## 三、改动方案

### 改动一：`callback()` 增加 Compose 缓存

**涉及文件**: `packages/koatty-core/src/Application.ts`  
**修改量**: ~20 行  
**风险**: 极低

#### 3.1.1 新增私有属性

在 `Koatty` 类中，与 `middlewareStacks` 同级新增：

```typescript
/**
 * Cache for composed callback handlers per protocol.
 * Key: protocol name ('http', 'grpc', 'ws', etc.)
 * Value: composed request handler function
 * 
 * Invalidated when middleware stack changes via use().
 * Handlers with reqHandler parameter are NOT cached (dynamic registration).
 */
private composedCallbackCache: Map<string, 
  (req: RequestType, res: ResponseType) => Promise<any>
> = new Map();
```

#### 3.1.2 修改 `callback()` 方法

```typescript
callback(protocol = "http", reqHandler?: (ctx: KoattyContext) => Promise<any>) {
    // ★ 快路径：无 reqHandler 且缓存命中时直接返回
    if (!reqHandler) {
      const cached = this.composedCallbackCache.get(protocol);
      if (cached) return cached;
    }

    // --- 以下为原有逻辑，完全保持不变 ---
    let protocolMiddleware = this.middlewareStacks.get(protocol);
    
    if (!protocolMiddleware) {
      protocolMiddleware = [...this.middleware];
      this.middlewareStacks.set(protocol, protocolMiddleware);
      this.initializedProtocols.add(protocol);
    }
    
    if (reqHandler) {
      protocolMiddleware.push(reqHandler);
    }
    
    const fn = koaCompose(protocolMiddleware as any);
    if (!this.listenerCount('error')) this.on('error', this.onerror);

    const handler = (req: RequestType, res: ResponseType) => {
      const ctx: any = this.createContext(req, res, protocol);
      if (!this.ctxStorage) {
        return this.handleRequest(ctx, fn as any);
      }
      return this.ctxStorage.run(ctx, async () => {
        return this.handleRequest(ctx, fn as any);
      });
    };

    // ★ 无 reqHandler 时缓存（有 reqHandler 为动态注册，不缓存）
    if (!reqHandler) {
      this.composedCallbackCache.set(protocol, handler);
    }

    return handler;
}
```

#### 3.1.3 修改 `use()` 方法 —— 增加缓存失效

```typescript
use(fn: Function): any {
    if (!Helper.isFunction(fn)) {
      Logger.Error('The parameter is not a function.');
      return;
    }
    // ★ 中间件栈变化，清除所有协议的组合缓存
    this.composedCallbackCache.clear();
    return super.use(<any>fn);
}
```

> **注意**：`useExp()` 内部调用 `this.use(parseExp(fn))`，自动触发缓存失效，无需额外修改。

#### 3.1.4 缓存时序分析

```
  loadMiddleware: app.use(trace)      → cache cleared ✓
  loadMiddleware: app.use(userMw)     → cache cleared ✓
  loadRouter:     app.use(payload)    → cache cleared ✓  (改动二后的新时序)
  loadRouter:     app.use(routerMw)   → cache cleared ✓
  loadServe:      server created      → callback() NOT called yet
  appReady:       (no more use())     → cache stays empty
  listen():       server starts
  ──────── 第一个请求到达 ────────
  callback("http")                    → cache miss → compose → cache set ✓
  ──────── 后续所有请求 ────────
  callback("http")                    → cache hit → 直接返回 ✓  (零 compose 开销)
```

#### 3.1.5 对各协议的影响

| 协议 | 调用方式 | 缓存效果 |
|------|----------|----------|
| HTTP | `this.app.callback()(req, res)` | 首次 compose + 缓存，后续直接返回 |
| HTTPS | `this.app.callback()(req, res)` | 同上 |
| HTTP/2 | `this.app.callback()(req, res)` | 同上 |
| HTTP/3 | `this.app.callback()(req, res)` | 同上 |
| gRPC | `this.app.callback("grpc")` | 首次 compose + 缓存（按 "grpc" 键） |
| WebSocket | `this.app.callback('ws')` | 首次 compose + 缓存（按 "ws" 键） |

**koatty-serve 各服务器代码零改动。**

---

### 改动二：Payload 中间件注册时机前移

**涉及文件**: `packages/koatty-router/src/RouterComponent.ts`  
**修改量**: ~8 行  
**风险**: 低

#### 3.2.1 在 `initRouter()` 中提前注册 payload

将 payload 中间件从 `@OnEvent(AppEvent.appReady)` 移至 `@OnEvent(AppEvent.loadRouter)`，
并置于路由中间件注册**之前**：

```typescript
@OnEvent(AppEvent.loadRouter)
async initRouter(app: KoattyApplication): Promise<void> {
    const routerOpts = app.config(undefined, 'router') || {};
    const serveOpts = app.config(undefined, 'server') ?? { protocol: "http" };
    const protocol = serveOpts.protocol ?? "http";
    const protocols = Helper.isArray(protocol) ? protocol : [protocol];

    Logger.Log('Koatty', '', `Creating routers for protocols: ${protocols.join(', ')}`);

    // Step 1: Create and bind router instance(s)
    if (protocols.length > 1) {
      // ... 多协议路由创建逻辑保持不变 ...
    } else {
      // ... 单协议路由创建逻辑保持不变 ...
    }

    // ★ Step 2: 在路由中间件之前注册 payload 中间件
    // 确保 ctx.requestBody()、ctx.requestParam() 等方法在路由 handler 中可用
    app.use(payload(app.config('payload', 'router')));
    Logger.Debug('Payload middleware registered (before router)');

    // Step 3: Load controller routes (内部调用 app.use(routerMiddleware))
    await this.loadRoutes(app);
}
```

#### 3.2.2 清理 `appReady` 事件中的 payload 注册

```typescript
@OnEvent(AppEvent.appReady)
async run(_app: KoattyApplication): Promise<void> {
    // payload 已在 loadRouter 阶段提前注册
    // 此方法保留为扩展点
}
```

#### 3.2.3 修改后的中间件执行顺序

```
  请求到达
    ↓
  Trace 链路追踪中间件
    ↓
  用户自定义中间件
    ↓
  Payload 中间件 (定义 ctx.requestBody / ctx.requestParam 等)  ← 前移到此处
    ↓
  路由中间件 (router.routes() + allowedMethods())
    ↓
  路由 Handler → Controller Method 执行
    ↓
  响应返回（洋葱模型回溯）
```

#### 3.2.4 兼容性说明

- **对 HTTP 路由**：payload 在路由之前执行，`ctx.requestBody()` 等方法正确可用
- **对 gRPC/WS**：payload 中间件仍在全局栈中，对非 HTTP 上下文只定义 helper 并调用 `next()`，
  不影响功能（与改动前行为一致，因为 payload 本来就在全局栈中）
- **对 `strategy-extractor.ts`**：直接导入 `bodyParser()` 的代码继续有效（双重保障）
- **配置可用性**：`loadRouter` 在 `appBoot`（加载配置）之后，`app.config('payload', 'router')`
  已可正确读取

---

### 改动三：`callback()` 接口增加 Koa 兼容重载签名

**涉及文件**: `packages/koatty-core/src/IApplication.ts`  
**修改量**: ~10 行  
**风险**: 无（纯类型层面）

#### 3.3.1 更新 `KoattyApplication` 接口中 `callback` 的类型定义

将现有签名：

```typescript
readonly callback: (protocol?: string, reqHandler?: (ctx: KoattyContext) => Promise<any>) => {
    (req: RequestType, res: ResponseType): Promise<any>
};
```

替换为重载签名：

```typescript
/**
 * Create a callback function for handling requests.
 * 
 * Overload 1 (Koa-compatible): No arguments, returns standard HTTP request handler.
 *   Compatible with http.createServer(), supertest, serverless-http, etc.
 * 
 * Overload 2 (Extended): Protocol-specific handler with optional request handler injection.
 *   Used for gRPC, WebSocket and other protocol-specific middleware chains.
 * 
 * @example
 * ```typescript
 * // Standard usage (Koa-compatible)
 * const handler = app.callback();
 * http.createServer(handler);
 * 
 * // Protocol-specific usage
 * const grpcHandler = app.callback('grpc');
 * ```
 */
readonly callback: {
    (): (req: RequestType, res: ResponseType) => Promise<any>;
    (protocol: string, reqHandler?: (ctx: KoattyContext) => Promise<any>): 
      (req: RequestType, res: ResponseType) => Promise<any>;
};
```

#### 3.3.2 验证

现有测试已覆盖两种调用模式：

```typescript
// 无参调用 (Koa-compatible) — packages/koatty-core/test/app.test.ts:225
const callback = app.callback();

// 带协议参数 — packages/koatty-core/test/app.test.ts:230
const callback = app.callback("ws");

// 带 reqHandler — packages/koatty-core/test/app.test.ts:238
const callback = app.callback("http", reqHandler);

// supertest 使用 — packages/koatty/test/app.test.ts:25
const res = await request(app.callback()).get('/');
```

实现代码（`Application.ts`）无需改动，默认参数 `protocol = "http"` 已正确处理无参调用。

---

### 改动四：Bootstrap 与 Listen 分离 + Ready 状态

**涉及文件**:
- `packages/koatty-core/src/Application.ts` (~25 行)
- `packages/koatty-core/src/IApplication.ts` (~15 行)
- `packages/koatty/src/core/Bootstrap.ts` (~40 行)

**风险**: 低

#### 3.4.1 `Koatty` 类增加 Ready 状态和 `getRequestHandler()`

在 `packages/koatty-core/src/Application.ts` 中新增：

```typescript
// ===== 新增属性 =====

/**
 * Application ready state flag.
 * Set to true after bootstrap completes (all components loaded).
 */
private _ready: boolean = false;

// ===== 新增方法 =====

/**
 * Whether the application has completed initialization
 * and is ready to handle requests.
 */
get isReady(): boolean {
    return this._ready;
}

/**
 * Mark the application as ready.
 * Called internally after bootstrap completes.
 * @internal
 */
markReady(): void {
    this._ready = true;
    Logger.Log('Koatty', '', 'Application is ready');
}

/**
 * Get a standard Node.js HTTP request handler for serverless/custom deployment.
 * 
 * Returns a `(req, res) => Promise<void>` function that can be used with:
 * - Serverless platforms (AWS Lambda, Alibaba Cloud FC, etc.)
 * - Custom HTTP servers (`http.createServer(handler)`)
 * - Testing frameworks (`supertest`)
 * 
 * @param {string} [protocol='http'] Protocol type
 * @returns {Function} Standard Node.js request handler
 * @throws {Error} If application has not completed bootstrap
 * 
 * @example
 * ```typescript
 * // Serverless deployment
 * const app = await createApplication(MyApp);
 * const handler = app.getRequestHandler();
 * export { handler };
 * 
 * // Custom server
 * const app = await createApplication(MyApp);
 * http.createServer(app.getRequestHandler()).listen(3000);
 * ```
 */
getRequestHandler(protocol = "http") {
    if (!this._ready) {
        throw new Error(
            'Application is not ready. Ensure bootstrap is complete before calling getRequestHandler(). ' +
            'Use createApplication() or ExecBootStrap() first.'
        );
    }
    return this.callback(protocol);
}
```

#### 3.4.2 更新 `KoattyApplication` 接口

在 `packages/koatty-core/src/IApplication.ts` 的 `KoattyApplication` 接口中新增：

```typescript
/**
 * Whether the application has completed initialization and is ready to handle requests.
 */
readonly isReady: boolean;

/**
 * Mark the application as ready after bootstrap.
 * @internal
 */
readonly markReady: () => void;

/**
 * Get a standard Node.js HTTP request handler for serverless/custom deployment.
 * Must be called after bootstrap is complete (isReady === true).
 * 
 * @param {string} [protocol='http'] Protocol type
 * @returns {Function} Standard (req, res) => Promise<any> handler
 * @throws {Error} If application is not ready
 */
readonly getRequestHandler: (protocol?: string) => 
  (req: RequestType, res: ResponseType) => Promise<any>;
```

#### 3.4.3 重构 `Bootstrap.ts`

将 `executeBootstrap` 拆分为两个函数：

```typescript
/**
 * Core bootstrap logic: initialize app, load all components, but do NOT start server.
 * This is the shared foundation for both traditional and serverless deployment.
 * 
 * @param target - The application class (must extend Koatty)
 * @param bootFunc - Optional function to execute during bootstrap
 * @param isInitiative - Whether the bootstrap is initiated manually
 * @returns Bootstrapped application instance
 * @throws Error on bootstrap failure (caller must handle)
 * @internal
 */
const bootstrapApplication = async function (
    target: any,
    bootFunc?: (...args: any[]) => any,
    isInitiative = false
): Promise<KoattyApplication> {
    // Disable winston internal debug logs
    if (process.env.NODE_DEBUG) {
        const debugModules = process.env.NODE_DEBUG.split(',')
            .filter(m => !m.includes('winston'))
            .join(',');
        process.env.NODE_DEBUG = debugModules;
    }

    // checked runtime
    checkRuntime();
    // unittest running environment
    const isUTRuntime = checkUTRuntime();
    if (!isInitiative && isUTRuntime) {
        return;
    }

    const app = <KoattyApplication>Reflect.construct(target, []);
    // unittest does not print startup logs
    if (isUTRuntime) {
        app.silent = true;
        Logger.enable(false);
    }

    if (!app.silent) console.log(LOGO);
    if (!(app instanceof Koatty)) {
        throw new Error(`class ${target.name} does not inherit from Koatty`);
    }

    // Initialize env
    Loader.initialize(app);

    // exec bootFunc
    if (Helper.isFunction(bootFunc)) {
        Logger.Log('Koatty', '', 'Execute bootFunc ...');
        await bootFunc(app);
    }
    // Set IOC.app
    IOC.setApp(app);

    // Check all bean
    Logger.Log('Koatty', '', 'ComponentScan ...');
    Loader.CheckAllComponents(app, target);

    // Load All components
    await Loader.LoadAllComponents(app, target);

    // ★ Mark application as ready
    app.markReady();

    return app;
};

/**
 * Traditional bootstrap: initialize + start server listening.
 * Preserves original behavior for existing applications.
 * @internal
 */
const executeBootstrap = async function (
    target: any,
    bootFunc?: (...args: any[]) => any,
    isInitiative = false
): Promise<KoattyApplication> {
    try {
        const app = await bootstrapApplication(target, bootFunc, isInitiative);

        if (app && !checkUTRuntime()) {
            app.listen(listenCallback);
        }

        return app;
    } catch (err) {
        Logger.Fatal(err);
    }
};

// ★ ExecBootStrap 保持不变 — 内部调用 executeBootstrap
export function ExecBootStrap(bootFunc?: (...args: any[]) => any) {
    return async (target: any) => {
        if (!(target.prototype instanceof Koatty)) {
            throw new Error(`class ${target.name} does not inherit from Koatty`);
        }
        return await executeBootstrap(target, bootFunc, true);
    };
}

/**
 * ★ 新增导出：仅初始化应用，不启动服务器监听。
 * 
 * 用于 Serverless、自定义部署、集成测试等场景。
 * 返回已完成 IOC/AOP/中间件/路由加载的 app 实例。
 * 
 * @param target - Application class (must extend Koatty)
 * @param bootFunc - Optional bootstrap function
 * @returns Fully initialized KoattyApplication instance
 * @throws Error if target does not extend Koatty, or bootstrap fails
 * 
 * @example
 * ```typescript
 * import { createApplication } from 'koatty';
 * import { App } from './app';
 * 
 * // Serverless handler
 * const app = await createApplication(App);
 * const handler = app.getRequestHandler();
 * 
 * // Use with serverless-http
 * export default serverlessHttp(handler);
 * ```
 */
export async function createApplication(
    target: any,
    bootFunc?: (...args: any[]) => any
): Promise<KoattyApplication> {
    if (!(target.prototype instanceof Koatty)) {
        throw new Error(`class ${target.name} does not inherit from Koatty`);
    }
    return await bootstrapApplication(target, bootFunc, true);
}
```

#### 3.4.4 导出路径

`createApplication` 通过 `packages/koatty/src/index.ts` 中已有的 `export * from "./core/Bootstrap"` 
自动导出，**无需额外修改 `index.ts`**。

---

## 四、改动总览

| # | 改动 | 涉及包 | 涉及文件 | 修改行数 | 风险 |
|:-:|------|--------|----------|:--------:|:----:|
| 1 | callback compose 缓存 | `koatty-core` | `Application.ts` | ~20 | 极低 |
| 2 | payload 中间件前移 | `koatty-router` | `RouterComponent.ts` | ~8 | 低 |
| 3 | 接口重载签名 | `koatty-core` | `IApplication.ts` | ~10 | 无 |
| 4 | Bootstrap 分离 + Ready 状态 | `koatty-core` + `koatty` | `Application.ts`, `IApplication.ts`, `Bootstrap.ts` | ~60 | 低 |

**合计**: ~98 行修改，跨 3 个包、4 个文件。

---

## 五、向后兼容性保证

| 场景 | 影响 |
|------|------|
| 现有 `@Bootstrap()` 装饰器项目 | 零改动。`ExecBootStrap()` 行为完全不变 |
| 现有 `app.callback()` 调用 | 首次调用行为不变，后续调用走缓存（性能提升） |
| 现有 `app.callback("grpc")` 调用 | 同上，按协议键独立缓存 |
| 现有 `app.callback("http", reqHandler)` | 不缓存（与改动前行为完全一致） |
| 现有中间件 | 执行顺序从 `trace→user→router→payload` → `trace→user→payload→router`（更合理） |
| `strategy-extractor.ts` 直接调用 `bodyParser()` | 继续有效（双重保障） |
| koatty-serve 各协议服务器 | 零改动。仍调用 `app.callback()`，但自动受益于缓存 |
| 第三方 Koa 中间件 / supertest | `app.callback()` 无参调用返回标准 `(req, res)` handler |
| 单元测试 | 现有测试用例全部兼容（已验证 `app.test.ts`、`koa3-integration.test.ts`） |

---

## 六、实施步骤

建议按以下顺序独立提交和测试：

### Phase 1: callback compose 缓存（改动一）

```
1. 修改 Application.ts：新增 composedCallbackCache 属性
2. 修改 Application.ts：callback() 增加缓存逻辑
3. 修改 Application.ts：use() 增加缓存失效
4. 运行 koatty-core 单元测试
5. 运行 koatty 集成测试
```

### Phase 2: payload 中间件前移（改动二）

```
1. 修改 RouterComponent.ts：initRouter() 中提前注册 payload
2. 修改 RouterComponent.ts：清理 appReady 中的 payload 注册
3. 运行 koatty-router 单元测试
4. 运行 koatty 集成测试
```

### Phase 3: 接口重载签名（改动三）

```
1. 修改 IApplication.ts：更新 callback 类型定义
2. 运行 TypeScript 编译检查
3. 运行 koatty-core 单元测试
```

### Phase 4: Bootstrap 分离 + Ready 状态（改动四）

```
1. 修改 Application.ts：新增 _ready、isReady、markReady()、getRequestHandler()
2. 修改 IApplication.ts：接口新增对应声明
3. 修改 Bootstrap.ts：拆分 bootstrapApplication() + 新增 createApplication()
4. 运行 koatty 全量测试
5. 编写 createApplication + getRequestHandler 的新测试用例
```

---

## 七、Serverless 使用示例（改造完成后即可实现）

### 7.1 阿里云函数计算（HTTP 触发器）

```typescript
// China Cloud: Alibaba Cloud FC
import { createApplication } from 'koatty';
import { App } from './app';

let handler: (req: any, res: any) => Promise<any>;

export async function initializer() {
    const app = await createApplication(App);
    handler = app.getRequestHandler();
}

export async function httpHandler(req: any, resp: any, context: any) {
    await handler(req, resp);
}
```

### 7.2 AWS Lambda

```typescript
import { createApplication } from 'koatty';
import { App } from './app';
import serverless from 'serverless-http';

let cachedHandler: any;

export const handler = async (event: any, context: any) => {
    if (!cachedHandler) {
        const app = await createApplication(App);
        // serverless-http 接受标准 (req, res) handler
        cachedHandler = serverless(app.getRequestHandler());
    }
    return cachedHandler(event, context);
};
```

### 7.3 自定义 HTTP 服务器集成

```typescript
import { createServer } from 'http';
import { createApplication } from 'koatty';
import { App } from './app';

async function main() {
    const app = await createApplication(App);
    const handler = app.getRequestHandler();
    
    const server = createServer(handler);
    server.listen(3000, () => {
        console.log('Custom server running on port 3000');
    });
}

main();
```

### 7.4 集成测试

```typescript
import { createApplication } from 'koatty';
import { App } from './app';
import request from 'supertest';

describe('API Tests', () => {
    let app: any;

    beforeAll(async () => {
        app = await createApplication(App);
    });

    it('GET /', async () => {
        const res = await request(app.getRequestHandler()).get('/');
        expect(res.status).toBe(200);
    });
});
```

---

## 八、后续扩展方向

本次改造完成后，将为以下能力提供基础：

1. **Serverless Adapter 层**：基于 `createApplication()` + `getRequestHandler()` 构建各平台适配器
2. **冷启动优化**：`bootstrapApplication()` 可配合平台预热机制，减少首次请求延迟
3. **多实例部署**：`createApplication()` 支持独立创建多个 app 实例（需注意 IOC 单例限制）
4. **运行时中间件热加载**：`composedCallbackCache` 的失效机制为运行时动态加载中间件提供了基础

---

## 附录：关键代码位置索引

| 文件 | 关键代码 | 行号 |
|------|----------|------|
| `koatty-core/src/Application.ts` | `callback()` 方法 | 518-547 |
| `koatty-core/src/Application.ts` | `use()` 方法 | 180-186 |
| `koatty-core/src/Application.ts` | `useExp()` 方法 | 196-202 |
| `koatty-core/src/Application.ts` | `createContext()` 方法 | 386-393 |
| `koatty-core/src/Application.ts` | `handleRequest()` 方法 | 557-566 |
| `koatty-core/src/Application.ts` | `listen()` 方法 | 404-431 |
| `koatty-core/src/IApplication.ts` | `KoattyApplication` 接口 | 41-203 |
| `koatty-router/src/RouterComponent.ts` | `initRouter()` 方法 | 52-109 |
| `koatty-router/src/RouterComponent.ts` | `run()` (appReady) | 151-154 |
| `koatty-router/src/router/http.ts` | `LoadRouter()` 方法 | 79-135 |
| `koatty-serve/src/server/http.ts` | `createProtocolServer()` | 43-61 |
| `koatty-serve/src/server/https.ts` | `createProtocolServer()` | 44-67 |
| `koatty-serve/src/server/http2.ts` | `createProtocolServer()` | 43-53 |
| `koatty-serve/src/server/grpc.ts` | `app.callback("grpc")` 调用 | 730 |
| `koatty-serve/src/server/ws.ts` | `app.callback('ws')` 调用 | 265 |
| `koatty/src/core/Bootstrap.ts` | `executeBootstrap()` 函数 | 61-119 |
| `koatty/src/core/Bootstrap.ts` | `ExecBootStrap()` 函数 | 30-37 |
