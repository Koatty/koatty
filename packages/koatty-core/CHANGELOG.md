# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.0.3](https://github.com/koatty/koatty_core/compare/koatty-core@2.0.2...koatty-core@2.0.3) (2025-10-30)

### [2.0.2](https://github.com/koatty/koatty_core/compare/koatty-core@2.0.1...koatty-core@2.0.2) (2025-10-30)


### Features

* sync version to dist/package.json during release ([c57ca04](https://github.com/koatty/koatty_core/commit/c57ca04c91bfb9acb41238ee72b54afb0ee4a683))

### [2.0.1](https://github.com/koatty/koatty_core/compare/koatty-core@2.0.0...koatty-core@2.0.1) (2025-10-30)


### Features

* add tsconfigRootDir to ESLint parser options ([89619bd](https://github.com/koatty/koatty_core/commit/89619bd3c59ec184b0defa19dae468263a77b449))
* enhance config decorator and update dependencies ([a0a13ab](https://github.com/koatty/koatty_core/commit/a0a13ab8b316a7e3bb9e76137550bedb8f616c59))
* enhance TypeScript support and fix package distribution paths ([20c0a9c](https://github.com/koatty/koatty_core/commit/20c0a9c681fbb703d76fd6abc428f0f0f483c24b))
* **logger:** enhance Logger interface and update usage ([194978c](https://github.com/koatty/koatty_core/commit/194978cbb9969ca1eed6556981e29f03386bec85))
* **trace:** enhance tracing with timeout handling and status checks ([caa6a10](https://github.com/koatty/koatty_core/commit/caa6a10d0d82064567f1a3f8f3146f28a7b7398d))


### Bug Fixes

* **koatty-serve:** 修复不稳定的时间相关测试 ([cf2d6b5](https://github.com/koatty/koatty_core/commit/cf2d6b5754a56217df1b912faf7cd40b01dbcbdc))
* **koatty-trace:** 修复ESLint错误和测试mock问题 ([b24e1f9](https://github.com/koatty/koatty_core/commit/b24e1f9dcc55c64f5d97f3ca01bc53161e7bdb7c))

## 2.0.0 (2025-10-25)


### ⚠ BREAKING CHANGES

* **scripts:** - Tag格式从 v{version} 改为 {package-name}@{version}

### Features

* add examples directory with basic-app example ([ef49c6f](https://github.com/koatty/koatty_core/commit/ef49c6f932b88ba947fc4c7f448d91b016e3e020))
* improve type safety in compress middleware ([61beb1d](https://github.com/koatty/koatty_core/commit/61beb1d206bebfd5f6fec9a2d1297f420be217a2))
* **koatty_core:** upgrade to Koa 3.0 ([fe246ad](https://github.com/koatty/koatty_core/commit/fe246ad773521b6117d212378b07faa30abd17e0))
* **koatty_router:** migrate from koa-graphql to graphql-http ([847821a](https://github.com/koatty/koatty_core/commit/847821ac80109c6f4fd953e0701ad695e4fb771f))
* make exception context fields optional and improve trace handling ([e0ec4db](https://github.com/koatty/koatty_core/commit/e0ec4db1ba7299b1d22018558f61288cb2564dc6))
* **release:** add release guide and automation script ([c5f01b1](https://github.com/koatty/koatty_core/commit/c5f01b17765a9b1eeb07c448b27be5ade9278569))
* update sync script to use HTTPS instead of SSH for package repos ([91c9fd7](https://github.com/koatty/koatty_core/commit/91c9fd74f080685cb2e8fab66e4765cbf86be57c))
* upgrade to Koa 3.0 (WIP) ([d14114c](https://github.com/koatty/koatty_core/commit/d14114c63d0f62fcd3a64296cbb6648ec1ee1e83))


### Bug Fixes

* **koatty_core:** attempt to fix test timeouts ([fb197ea](https://github.com/koatty/koatty_core/commit/fb197eab7d193616ed4255753c22df0b400c1bc6))
* resolve workspace dependencies in build process ([d8a2661](https://github.com/koatty/koatty_core/commit/d8a266123fee1dea8ea7be6a39401bf0c052688b))
* **scripts:** 修复monorepo中tag冲突问题 ([d2602bc](https://github.com/koatty/koatty_core/commit/d2602bcc8c245e6f2137a678ec0e5e2fd6ef673a))
* **scripts:** 增强release脚本的验证和调试信息 ([2e0db49](https://github.com/koatty/koatty_core/commit/2e0db499234bd4f132bbfc65559105fd9f98f926))
* 解决依赖问题以支持Koa 3.0升级 ([30cf0b5](https://github.com/koatty/koatty_core/commit/30cf0b53ed032c7de5ea24b4c2ed965e8d4948df))

## 2.0.0 (2025-10-24)


### Features

* improve type safety in compress middleware ([61beb1d](https://github.com/koatty/koatty_core/commit/61beb1d206bebfd5f6fec9a2d1297f420be217a2))
* **koatty_core:** upgrade to Koa 3.0 ([fe246ad](https://github.com/koatty/koatty_core/commit/fe246ad773521b6117d212378b07faa30abd17e0))
* **koatty_router:** migrate from koa-graphql to graphql-http ([847821a](https://github.com/koatty/koatty_core/commit/847821ac80109c6f4fd953e0701ad695e4fb771f))
* make exception context fields optional and improve trace handling ([e0ec4db](https://github.com/koatty/koatty_core/commit/e0ec4db1ba7299b1d22018558f61288cb2564dc6))
* **release:** add release guide and automation script ([c5f01b1](https://github.com/koatty/koatty_core/commit/c5f01b17765a9b1eeb07c448b27be5ade9278569))
* update sync script to use HTTPS instead of SSH for package repos ([91c9fd7](https://github.com/koatty/koatty_core/commit/91c9fd74f080685cb2e8fab66e4765cbf86be57c))
* upgrade to Koa 3.0 (WIP) ([d14114c](https://github.com/koatty/koatty_core/commit/d14114c63d0f62fcd3a64296cbb6648ec1ee1e83))


### Bug Fixes

* **koatty_core:** attempt to fix test timeouts ([fb197ea](https://github.com/koatty/koatty_core/commit/fb197eab7d193616ed4255753c22df0b400c1bc6))
* resolve workspace dependencies in build process ([d8a2661](https://github.com/koatty/koatty_core/commit/d8a266123fee1dea8ea7be6a39401bf0c052688b))
* 解决依赖问题以支持Koa 3.0升级 ([30cf0b5](https://github.com/koatty/koatty_core/commit/30cf0b53ed032c7de5ea24b4c2ed965e8d4948df))

### [1.17.1](https://github.com/koatty/koatty_core/compare/v1.17.0...v1.17.1) (2025-06-08)


### Bug Fixes

* adjust asyncEvent test assertions" ([e598668](https://github.com/koatty/koatty_core/commit/e59866846450bdee78b76ee1209dc49ed5794279))
* update asyncEvent return type and remove unnecessary return statement ([ea9691d](https://github.com/koatty/koatty_core/commit/ea9691df7f8e9319e857e2474a289e5532f9d868))

## [1.17.0](https://github.com/koatty/koatty_core/compare/v1.17.0-1...v1.17.0) (2025-06-08)

## [1.17.0-1](https://github.com/koatty/koatty_core/compare/v1.17.0-0...v1.17.0-1) (2025-06-02)

## [1.17.0-0](https://github.com/koatty/koatty_core/compare/v1.16.2...v1.17.0-0) (2025-06-02)


### Features

* add GraphQL protocol support to context creation and factory system ([d60f4bd](https://github.com/koatty/koatty_core/commit/d60f4bdd0275d07bd8450ea6401a719304312e8e))

### [1.16.3](https://github.com/koatty/koatty_core/compare/v1.16.2...v1.16.3) (2024-11-20)

#### 🚀 性能优化 (Performance Improvements)

* **Context**: 实现上下文对象池化，提升HTTP/HTTPS上下文创建性能
  - 添加`ContextPool`类支持上下文复用
  - 减少对象创建和垃圾回收开销
  - 支持池大小配置和统计监控
  - HTTP上下文创建性能提升至 < 0.1ms/个

* **Metadata**: 优化元数据访问性能
  - 实现`getMap()`结果缓存机制
  - 避免重复的对象转换操作
  - 在数据变更时自动失效缓存
  - 元数据操作性能提升至 < 0.01ms/次

* **Method Cache**: 预编译方法缓存优化
  - 预编译常用方法到`MethodCache`中
  - 避免重复创建函数对象
  - 使用单例工厂模式减少实例化开销

#### ✨ 新特性 (Features)

* **GraphQL**: 添加GraphQL协议支持
  - 新增`GraphQLContextFactory`类
  - 支持GraphQL查询、变量和操作名解析
  - 实现GraphQL特定的元数据处理
  - 添加完整的GraphQL上下文测试用例

* **Utils**: 完善工具函数测试覆盖率
  - 新增`test/utils.test.ts`测试文件
  - 实现100%测试覆盖率（语句、分支、函数、行）
  - 覆盖`parseExp`、`asyncEvent`、`isPrevent`、`bindProcessEvent`等函数

#### 🐛 修复 (Bug Fixes)

* **Context**: 修复上下文属性重置问题
  - 解决GraphQL上下文池化时的只读属性问题
  - 优化上下文重置逻辑，避免属性删除错误
  - 改进错误处理机制

* **ESLint**: 修复代码质量问题
  - 移除未使用的catch块参数
  - 解决Function类型使用警告

#### 📊 测试改进 (Testing)

* **Performance**: 新增性能测试套件
  - 上下文创建性能测试
  - 元数据操作性能测试  
  - 内存使用监控测试
  - 并发处理能力测试
  - 实现 > 10,000 ops/sec 并发处理能力

* **Coverage**: 大幅提升测试覆盖率
  - 整体项目覆盖率提升至约80%
  - Utils模块从20%提升至100%覆盖率
  - 新增68个测试用例，全部通过

### [1.16.2](https://github.com/koatty/koatty_core/compare/v1.16.1...v1.16.2) (2025-04-13)

## 1.16.0 (2025-04-12)

* build: v1.16.0 ([4343495](https://github.com/koatty/koatty_core/commit/4343495))



## <small>1.15.1 (2025-04-12)</small>

* build: deps ([d271ad0](https://github.com/koatty/koatty_core/commit/d271ad0))
* build: update rollup config ([08ff9ae](https://github.com/koatty/koatty_core/commit/08ff9ae))
* build: v1.15.1 ([f780bba](https://github.com/koatty/koatty_core/commit/f780bba))
* refactor: enhance controller decorators with typed IControllerOptions and middleware validation ([cbc5ba5](https://github.com/koatty/koatty_core/commit/cbc5ba5))
* refactor: extract system configuration logic into getSysConfig utility function ([99e4c74](https://github.com/koatty/koatty_core/commit/99e4c74))
* refactor: improve Metadata class to handle array values consistently in set and add methods ([68036f8](https://github.com/koatty/koatty_core/commit/68036f8))
* refactor: remove unused getSysConfig utility function and update related imports ([b1a73df](https://github.com/koatty/koatty_core/commit/b1a73df))
* refactor: update Rollup configuration to use rollup-plugin-terser and refine build process ([c88e133](https://github.com/koatty/koatty_core/commit/c88e133))
* refactor: update Rollup configuration, remove unused plugins, and enhance README documentation ([e9b5377](https://github.com/koatty/koatty_core/commit/e9b5377))
* docs: api docs ([a046c7d](https://github.com/koatty/koatty_core/commit/a046c7d))



## 1.15.0 (2025-03-16)

* build: v1.15.0 ([567219d](https://github.com/koatty/koatty_core/commit/567219d))
* refactor: comment out unused ctxStorage property in Koatty class for cleaner code ([42b216f](https://github.com/koatty/koatty_core/commit/42b216f))
* refactor: enhance documentation and type definitions for Koatty application and middleware interface ([874c0d6](https://github.com/koatty/koatty_core/commit/874c0d6))
* feat: 更新 IGraphQLImplementation 类型以接受 args 参数并升级版本至 1.13.0 ([fc8d9b5](https://github.com/koatty/koatty_core/commit/fc8d9b5))



## 1.14.0 (2025-03-15)

* build: v1.14.0 ([d9caff3](https://github.com/koatty/koatty_core/commit/d9caff3))
* feat: 更新 IGraphQLImplementation 类型以接受 args 参数 ([af53034](https://github.com/koatty/koatty_core/commit/af53034))
* docs: api doc ([b0f194c](https://github.com/koatty/koatty_core/commit/b0f194c))



## 1.13.0 (2025-03-13)

* build: v1.13.0 ([aea2e3a](https://github.com/koatty/koatty_core/commit/aea2e3a))
* feat: 添加 GrpcController、WebSocketController 和 GraphQLController 装饰器 ([7f716c2](https://github.com/koatty/koatty_core/commit/7f716c2))
* feat: 添加 IGraphQLImplementation 类型和更新 RouterImplementation 接口 ([5059371](https://github.com/koatty/koatty_core/commit/5059371))



## 1.12.0 (2025-03-12)

* build: deps ([b6eafaf](https://github.com/koatty/koatty_core/commit/b6eafaf))
* build: v1.12.0 ([5a1b73f](https://github.com/koatty/koatty_core/commit/5a1b73f))
* feat: add IGraphQLImplementation and GraphQLSchemaDefinition types ([3d227d0](https://github.com/koatty/koatty_core/commit/3d227d0))



## <small>1.11.6 (2025-01-26)</small>

* build: deps ([9b38a0d](https://github.com/koatty/koatty_core/commit/9b38a0d))
* build: v1.11.6 ([57bcf6b](https://github.com/koatty/koatty_core/commit/57bcf6b))
* fix: Adjustment of the priority of operating environment attributes ([20af6e1](https://github.com/koatty/koatty_core/commit/20af6e1))



## <small>1.11.5 (2025-01-14)</small>

* build: deps ([5ad884a](https://github.com/koatty/koatty_core/commit/5ad884a))
* build: v1.11.5 ([b998f2b](https://github.com/koatty/koatty_core/commit/b998f2b))
* fix: env undefined ([ee39277](https://github.com/koatty/koatty_core/commit/ee39277))



## <small>1.11.4 (2025-01-14)</small>

* build: v1.11.4 ([8699a14](https://github.com/koatty/koatty_core/commit/8699a14))
* fix: appdebug逻辑 ([1fc2fce](https://github.com/koatty/koatty_core/commit/1fc2fce))



## <small>1.11.3 (2025-01-14)</small>

* build: deps ([3916e72](https://github.com/koatty/koatty_core/commit/3916e72))
* build: v1.11.3 ([20c1520](https://github.com/koatty/koatty_core/commit/20c1520))
* fix: appDebug逻辑 ([f477a6a](https://github.com/koatty/koatty_core/commit/f477a6a))
* fix: appDebug逻辑 ([f35e785](https://github.com/koatty/koatty_core/commit/f35e785))



## <small>1.11.2 (2025-01-14)</small>

* build: v1.11.2 ([4cb98e1](https://github.com/koatty/koatty_core/commit/4cb98e1))



## <small>1.11.2-0 (2025-01-14)</small>

* build: deps ([b705ec5](https://github.com/koatty/koatty_core/commit/b705ec5))
* build: v1.11.2-0 ([627ac10](https://github.com/koatty/koatty_core/commit/627ac10))
* fix: env判断逻辑 ([95da7d8](https://github.com/koatty/koatty_core/commit/95da7d8))



## <small>1.11.1 (2025-01-14)</small>

* build: v1.11.1 ([68e19a0](https://github.com/koatty/koatty_core/commit/68e19a0))
* fix: app.env逻辑修改 ([163f105](https://github.com/koatty/koatty_core/commit/163f105))



## 1.11.0 (2024-12-03)

* build: v1.11.0 ([a6ce038](https://github.com/koatty/koatty_core/commit/a6ce038))
* test: add test case ([37653c7](https://github.com/koatty/koatty_core/commit/37653c7))
* test: add testcase ([940fc28](https://github.com/koatty/koatty_core/commit/940fc28))
* test: add testcase ([24e3e19](https://github.com/koatty/koatty_core/commit/24e3e19))
* test: enhance grpc context tests and add ws context tests ([d9f622c](https://github.com/koatty/koatty_core/commit/d9f622c))
* fix: add `setMetaData` method to gRPC context ([0116ca7](https://github.com/koatty/koatty_core/commit/0116ca7))
* fix: grpc metadata sending ([be9a3b9](https://github.com/koatty/koatty_core/commit/be9a3b9))
* fix: NativeServer types ([1a7dd5a](https://github.com/koatty/koatty_core/commit/1a7dd5a))
* docs: api doc ([ad8e0c8](https://github.com/koatty/koatty_core/commit/ad8e0c8))
* docs: update API documentation ([fe6a9a5](https://github.com/koatty/koatty_core/commit/fe6a9a5))
* feat: add default name property to application options ([f1f6a6b](https://github.com/koatty/koatty_core/commit/f1f6a6b))
* feat: enhance router options handling ([3426508](https://github.com/koatty/koatty_core/commit/3426508))
* style: spell ([fa144dc](https://github.com/koatty/koatty_core/commit/fa144dc))
* refactor: replace to Buffer.from() ([43063b1](https://github.com/koatty/koatty_core/commit/43063b1))



## <small>1.10.1 (2024-11-20)</small>

* build: deps ([8d8ddcf](https://github.com/koatty/koatty_core/commit/8d8ddcf))
* build: deps ([e31daf2](https://github.com/koatty/koatty_core/commit/e31daf2))
* build: v1.10.1 ([56d005e](https://github.com/koatty/koatty_core/commit/56d005e))
* test: test case ([1584427](https://github.com/koatty/koatty_core/commit/1584427))
* refactor: koattyserver ([3179d4f](https://github.com/koatty/koatty_core/commit/3179d4f))



## 1.10.0 (2024-11-12)

* build: v1.10.0 ([37672df](https://github.com/koatty/koatty_core/commit/37672df))
* docs: api doc ([a9ddbaa](https://github.com/koatty/koatty_core/commit/a9ddbaa))
* fix: fix ([10a36e7](https://github.com/koatty/koatty_core/commit/10a36e7))



## 1.10.0-20 (2024-11-11)

* build: v1.10.0-20 ([2a1c857](https://github.com/koatty/koatty_core/commit/2a1c857))
* fix: Cannot set property server of app ([3be538a](https://github.com/koatty/koatty_core/commit/3be538a))
* fix: redefined ([1d73d6d](https://github.com/koatty/koatty_core/commit/1d73d6d))



## 1.10.0-19 (2024-11-11)

* build: v1.10.0-19 ([5cdf112](https://github.com/koatty/koatty_core/commit/5cdf112))
* refactor: this.server as array ([42c1025](https://github.com/koatty/koatty_core/commit/42c1025))



## 1.10.0-18 (2024-11-11)

* build: v1.10.0-18 ([6b0ee6e](https://github.com/koatty/koatty_core/commit/6b0ee6e))
* refactor: trace middleware ([25565e7](https://github.com/koatty/koatty_core/commit/25565e7))
* refactor: trace move to core ([f32732d](https://github.com/koatty/koatty_core/commit/f32732d))
* test: test ([938cf08](https://github.com/koatty/koatty_core/commit/938cf08))
* test: test case ([16f3b77](https://github.com/koatty/koatty_core/commit/16f3b77))
* test: test case ([238abf2](https://github.com/koatty/koatty_core/commit/238abf2))



## 1.10.0-17 (2024-11-08)

* build: v1.10.0-17 ([c070d04](https://github.com/koatty/koatty_core/commit/c070d04))
* fix: server ([9a8a1aa](https://github.com/koatty/koatty_core/commit/9a8a1aa))
* chore: tsconfig ([bad144a](https://github.com/koatty/koatty_core/commit/bad144a))



## 1.10.0-16 (2024-11-08)

* build: v1.10.0-16 ([cb234f8](https://github.com/koatty/koatty_core/commit/cb234f8))
* chore: api-extractor ([1bf555a](https://github.com/koatty/koatty_core/commit/1bf555a))
* chore: tsconfig ([09b52d3](https://github.com/koatty/koatty_core/commit/09b52d3))



## 1.10.0-15 (2024-11-07)

* build: v1.10.0-15 ([dd5c658](https://github.com/koatty/koatty_core/commit/dd5c658))



## 1.10.0-14 (2024-11-06)

* build: v1.10.0-14 ([71f0db1](https://github.com/koatty/koatty_core/commit/71f0db1))
* docs: api doc ([d3288fe](https://github.com/koatty/koatty_core/commit/d3288fe))
* docs: api doc ([481b01d](https://github.com/koatty/koatty_core/commit/481b01d))
* refactor: mv func to utils ([c5b0733](https://github.com/koatty/koatty_core/commit/c5b0733))
* fix: build ([3124135](https://github.com/koatty/koatty_core/commit/3124135))



## 1.10.0-13 (2024-11-06)

* build: deps ([b7a1c9f](https://github.com/koatty/koatty_core/commit/b7a1c9f))
* build: v1.10.0-13 ([250486d](https://github.com/koatty/koatty_core/commit/250486d))
* refactor: component ([e7fa058](https://github.com/koatty/koatty_core/commit/e7fa058))



## 1.10.0-12 (2024-11-06)

* build: v1.10.0-12 ([3223f3a](https://github.com/koatty/koatty_core/commit/3223f3a))
* refactor: add component ([9091577](https://github.com/koatty/koatty_core/commit/9091577))
* perf: 优化 ([ce1dc89](https://github.com/koatty/koatty_core/commit/ce1dc89))



## 1.10.0-11 (2024-11-04)

* build: v1.10.0-11 ([779efa5](https://github.com/koatty/koatty_core/commit/779efa5))



## 1.10.0-10 (2024-11-04)

* build: v1.10.0-10 ([0a03538](https://github.com/koatty/koatty_core/commit/0a03538))



## 1.10.0-9 (2024-11-04)

* build: v1.10.0-9 ([23a7163](https://github.com/koatty/koatty_core/commit/23a7163))



## 1.10.0-8 (2024-11-04)

* build: v1.10.0-8 ([f3d74bf](https://github.com/koatty/koatty_core/commit/f3d74bf))



## 1.10.0-7 (2024-11-01)

* build: v1.10.0-7 ([d799512](https://github.com/koatty/koatty_core/commit/d799512))



## 1.10.0-6 (2024-11-01)

* build: v1.10.0-6 ([a179bbd](https://github.com/koatty/koatty_core/commit/a179bbd))



## 1.10.0-5 (2024-11-01)

* build: deps ([bfc78c4](https://github.com/koatty/koatty_core/commit/bfc78c4))
* build: v1.10.0-5 ([35f9f49](https://github.com/koatty/koatty_core/commit/35f9f49))
* chore: tsconfig ([4c34cf6](https://github.com/koatty/koatty_core/commit/4c34cf6))



## 1.10.0-4 (2024-10-31)

* build: deps ([5b3405c](https://github.com/koatty/koatty_core/commit/5b3405c))
* build: v1.10.0-4 ([99cdb98](https://github.com/koatty/koatty_core/commit/99cdb98))
* docs: api ([37c5bee](https://github.com/koatty/koatty_core/commit/37c5bee))



## 1.10.0-3 (2024-10-31)

* build: deps ([ffa14ee](https://github.com/koatty/koatty_core/commit/ffa14ee))
* build: v1.10.0-3 ([8766692](https://github.com/koatty/koatty_core/commit/8766692))
* fix: interface ([b9e5447](https://github.com/koatty/koatty_core/commit/b9e5447))
* docs: docs ([69752a7](https://github.com/koatty/koatty_core/commit/69752a7))
* perf: request and response type ([6f98734](https://github.com/koatty/koatty_core/commit/6f98734))



## 1.10.0-2 (2024-10-31)

* build: deps ([0eda2d5](https://github.com/koatty/koatty_core/commit/0eda2d5))
* build: v1.10.0-2 ([d83648a](https://github.com/koatty/koatty_core/commit/d83648a))



## 1.10.0-1 (2024-10-30)

* build: v1.10.0-1 ([acf858b](https://github.com/koatty/koatty_core/commit/acf858b))
* docs: api doc ([56af6c4](https://github.com/koatty/koatty_core/commit/56af6c4))
* docs: doc ([6307ddc](https://github.com/koatty/koatty_core/commit/6307ddc))
* refactor: 优化ctx创建，更加贴合koa的执行逻辑 ([6acfecf](https://github.com/koatty/koatty_core/commit/6acfecf))



## 1.10.0-0 (2024-10-30)

* build: v1.10.0-0 ([a4fe4d1](https://github.com/koatty/koatty_core/commit/a4fe4d1))
* perf: 优化 ([a8dc909](https://github.com/koatty/koatty_core/commit/a8dc909))



## 1.9.0 (2024-01-15)

* build: v1.9.0 ([7d0ef7b](https://github.com/koatty/koatty_core/commit/7d0ef7b))
* chore: versionrc ([4d6aed4](https://github.com/koatty/koatty_core/commit/4d6aed4))
* docs: api doc ([40de647](https://github.com/koatty/koatty_core/commit/40de647))



## 1.9.0-3 (2024-01-15)

* build: v1.9.0-3 ([a392699](https://github.com/koatty/koatty_core/commit/a392699))
* fix: IWsImplementation ([bb3a875](https://github.com/koatty/koatty_core/commit/bb3a875))



## 1.9.0-2 (2024-01-15)

* build: v1.9.0-2 ([9fefd3a](https://github.com/koatty/koatty_core/commit/9fefd3a))
* fix: IHttpImplementation ([106e83c](https://github.com/koatty/koatty_core/commit/106e83c))



## 1.9.0-1 (2024-01-15)

* build: v1.9.0-1 ([7d06f52](https://github.com/koatty/koatty_core/commit/7d06f52))
* fix: HttpImplementation ([39af80c](https://github.com/koatty/koatty_core/commit/39af80c))
* docs: api doc ([b9cf398](https://github.com/koatty/koatty_core/commit/b9cf398))



## 1.9.0-0 (2024-01-15)

* build: v1.9.0-0 ([8c3f95e](https://github.com/koatty/koatty_core/commit/8c3f95e))
* fix: 修改路由定义 ([7a3b0a7](https://github.com/koatty/koatty_core/commit/7a3b0a7))
* feat: ctx增加requestParam、requestBody ([165e2de](https://github.com/koatty/koatty_core/commit/165e2de))



## <small>1.8.6 (2024-01-04)</small>

* build: v1.8.6 ([534a6f1](https://github.com/koatty/koatty_core/commit/534a6f1))



## <small>1.8.5 (2024-01-04)</small>

* build: deps ([f6f7b5d](https://github.com/koatty/koatty_core/commit/f6f7b5d))
* build: v1.8.5 ([7fbf0ca](https://github.com/koatty/koatty_core/commit/7fbf0ca))



## <small>1.8.4 (2023-12-11)</small>

* build: v1.8.4 ([0fc2119](https://github.com/koatty/koatty_core/commit/0fc2119))
* chore: pnpm ([af85d33](https://github.com/koatty/koatty_core/commit/af85d33))
* chore: pnpm ([d644c4c](https://github.com/koatty/koatty_core/commit/d644c4c))
* style: style ([441a013](https://github.com/koatty/koatty_core/commit/441a013))



## <small>1.8.2 (2023-11-09)</small>

* build: v1.8.2 ([4fcd1cc](https://github.com/koatty/koatty_core/commit/4fcd1cc))
* fix: use const ([2ba24ae](https://github.com/koatty/koatty_core/commit/2ba24ae))
* docs: api doc ([8b8504d](https://github.com/koatty/koatty_core/commit/8b8504d))



## <small>1.8.1 (2023-11-08)</small>

* build: v1.8.1 ([259a344](https://github.com/koatty/koatty_core/commit/259a344))
* fix: export AppEventArr ([a93e1a9](https://github.com/koatty/koatty_core/commit/a93e1a9))
* docs: api doc ([13fd5d4](https://github.com/koatty/koatty_core/commit/13fd5d4))



## 1.8.0 (2023-11-08)

* build: audit ([b2040cf](https://github.com/koatty/koatty_core/commit/b2040cf))
* build: v1.8.0 ([1f28476](https://github.com/koatty/koatty_core/commit/1f28476))
* feat: add app event ([fd26da9](https://github.com/koatty/koatty_core/commit/fd26da9))
* feat: add AppEvent defined ([79c26c3](https://github.com/koatty/koatty_core/commit/79c26c3))
* docs: api doc ([d95bf80](https://github.com/koatty/koatty_core/commit/d95bf80))



## <small>1.7.10 (2023-09-12)</small>

* build: v1.7.10 ([7c72e9a](https://github.com/koatty/koatty_core/commit/7c72e9a))
* fix: restore thinkPath ([76885fe](https://github.com/koatty/koatty_core/commit/76885fe))
* docs: api doc ([2a0a9ed](https://github.com/koatty/koatty_core/commit/2a0a9ed))



## <small>1.7.9 (2023-09-12)</small>

* build: v1.7.9 ([c7601d8](https://github.com/koatty/koatty_core/commit/c7601d8))
* fix: comment ([096f93d](https://github.com/koatty/koatty_core/commit/096f93d))
* fix: logsPath ([332af7f](https://github.com/koatty/koatty_core/commit/332af7f))
* docs: api doc ([d93f831](https://github.com/koatty/koatty_core/commit/d93f831))



## <small>1.7.8 (2023-03-04)</small>

* build: v1.7.8 ([1460a46](https://github.com/koatty/koatty_core/commit/1460a46))
* fix: app.listen param ([4a2b2ab](https://github.com/koatty/koatty_core/commit/4a2b2ab))



## <small>1.7.7 (2023-03-04)</small>

* build: v1.7.7 ([f08683d](https://github.com/koatty/koatty_core/commit/f08683d))
* fix: emit appStart event ([76f3ea8](https://github.com/koatty/koatty_core/commit/76f3ea8))
* docs: api doc ([b69c12d](https://github.com/koatty/koatty_core/commit/b69c12d))



## <small>1.7.6 (2023-02-26)</small>

* build: v1.7.6 ([1f1bb6d](https://github.com/koatty/koatty_core/commit/1f1bb6d))
* fix: app version ([0dc527b](https://github.com/koatty/koatty_core/commit/0dc527b))



## <small>1.7.4 (2023-02-26)</small>

* build: v1.7.4 ([96e0c9c](https://github.com/koatty/koatty_core/commit/96e0c9c))
* docs: api ([bf661a0](https://github.com/koatty/koatty_core/commit/bf661a0))
* docs: api doc ([1e1a92d](https://github.com/koatty/koatty_core/commit/1e1a92d))
* fix: remove context ingerface metadata ([cb59579](https://github.com/koatty/koatty_core/commit/cb59579))
* fix: rename ([e3ca5c3](https://github.com/koatty/koatty_core/commit/e3ca5c3))



## <small>1.7.2 (2023-02-26)</small>

* build: v1.7.2 ([0039526](https://github.com/koatty/koatty_core/commit/0039526))
* fix: getMetaData return type ([e5e529d](https://github.com/koatty/koatty_core/commit/e5e529d))
* docs: api doc ([fdcc676](https://github.com/koatty/koatty_core/commit/fdcc676))



## <small>1.7.1 (2023-02-20)</small>

* build: v1.7.1 ([a8769a1](https://github.com/koatty/koatty_core/commit/a8769a1))
* fix: getMetaData return type ([24c72a1](https://github.com/koatty/koatty_core/commit/24c72a1))
* docs: api doc ([5ee4527](https://github.com/koatty/koatty_core/commit/5ee4527))



## 1.7.0 (2023-02-20)

* build: deps ([7ad9331](https://github.com/koatty/koatty_core/commit/7ad9331))
* build: v1.7.0 ([2f04586](https://github.com/koatty/koatty_core/commit/2f04586))
* feat: add app.name ([97421d1](https://github.com/koatty/koatty_core/commit/97421d1))



## <small>1.6.12 (2023-01-13)</small>

* build: jest config ([3dfa148](https://github.com/koatty/koatty_core/commit/3dfa148))
* build: upgrade deps ([35b8b17](https://github.com/koatty/koatty_core/commit/35b8b17))
* build: v1.6.12 ([e21373f](https://github.com/koatty/koatty_core/commit/e21373f))



## <small>1.6.10 (2023-01-09)</small>

* build: audit fix ([e2a30c6](https://github.com/koatty/koatty_core/commit/e2a30c6))
* build: v1.6.10 ([055212b](https://github.com/koatty/koatty_core/commit/055212b))
* docs: edit ([3c081c9](https://github.com/koatty/koatty_core/commit/3c081c9))



## <small>1.6.9 (2022-10-31)</small>

* build: v1.6.9 ([38a57b5](https://github.com/koatty/koatty_core/commit/38a57b5))
* fix: remove property ([ad38fca](https://github.com/koatty/koatty_core/commit/ad38fca))
* fix: upgrade deps ([ae3240c](https://github.com/koatty/koatty_core/commit/ae3240c))



## <small>1.6.8 (2022-05-26)</small>

* build: v1.6.8 ([5877a7f](https://github.com/koatty/koatty_core/commit/5877a7f))
* build: 升级依赖 , ([401c970](https://github.com/koatty/koatty_core/commit/401c970))
* build: 更新配置 ([424f631](https://github.com/koatty/koatty_core/commit/424f631))
* chore: commitlint ([23b2bc8](https://github.com/koatty/koatty_core/commit/23b2bc8))



## <small>1.6.6 (2022-03-15)</small>

* 🔧 build: v1.6.6 ([16a70a5](https://github.com/koatty/koatty_core/commit/16a70a5))
* style: 缩进 ([afa9d48](https://github.com/koatty/koatty_core/commit/afa9d48))
* refactor: KoattyMetadata移除依赖 ([2843080](https://github.com/koatty/koatty_core/commit/2843080))



## <small>1.6.5 (2022-03-14)</small>

* 🐞 fix: 类型错误 ([4961c95](https://github.com/koatty/koatty_core/commit/4961c95))
* 🔧 build: v1.6.5 ([86e3c20](https://github.com/koatty/koatty_core/commit/86e3c20))



## <small>1.6.4 (2022-03-14)</small>

* 🐞 fix: ws参数传递错误 ([8a18e2d](https://github.com/koatty/koatty_core/commit/8a18e2d))
* 📃 docs: ([3f839ed](https://github.com/koatty/koatty_core/commit/3f839ed))
* 🔧 build: v1.6.4 ([502fbe4](https://github.com/koatty/koatty_core/commit/502fbe4))



## <small>1.6.3 (2022-03-11)</small>

* 🔧 build: v1.6.3 ([c4c60a1](https://github.com/koatty/koatty_core/commit/c4c60a1))
* 🦄 refactor: ([8580ca7](https://github.com/koatty/koatty_core/commit/8580ca7))



## <small>1.6.2 (2022-03-11)</small>

* 📃 docs: ([ae644d3](https://github.com/koatty/koatty_core/commit/ae644d3))
* 📃 docs: ([2e3c344](https://github.com/koatty/koatty_core/commit/2e3c344))
* 🔧 build: v1.6.2 ([dc24331](https://github.com/koatty/koatty_core/commit/dc24331))
* 🦄 refactor: ([a4956bb](https://github.com/koatty/koatty_core/commit/a4956bb))



## <small>1.6.2-0 (2022-03-11)</small>

* 📃 docs: ([7db9c23](https://github.com/koatty/koatty_core/commit/7db9c23))
* 🔧 build: v1.6.2-0 ([c6609f7](https://github.com/koatty/koatty_core/commit/c6609f7))



## <small>1.6.1 (2022-02-23)</small>

* 🐞 fix: options移入各自组件 ([f9ca1b3](https://github.com/koatty/koatty_core/commit/f9ca1b3))
* 🔧 build: v1.6.1 ([7fe29be](https://github.com/koatty/koatty_core/commit/7fe29be))



## 1.6.0 (2022-02-21)

* 🐛 fix: remove import ([1821382](https://github.com/koatty/koatty_core/commit/1821382))
* 🔧 build: v1.6.0 ([385842d](https://github.com/koatty/koatty_core/commit/385842d))



## 1.6.0-0 (2022-02-18)

* 🐳 chore: ([06ee023](https://github.com/koatty/koatty_core/commit/06ee023))
* 🔧 build: ([f03fb00](https://github.com/koatty/koatty_core/commit/f03fb00))
* 🔧 build: ([63c5e3a](https://github.com/koatty/koatty_core/commit/63c5e3a))
* 🔧 build: commitlint ([aa05225](https://github.com/koatty/koatty_core/commit/aa05225))
* 🔧 build: gitmoji ([9c97b4a](https://github.com/koatty/koatty_core/commit/9c97b4a))
* 🔧 build: husky配置 ([142e315](https://github.com/koatty/koatty_core/commit/142e315))
* 🔧 build: v1.6.0-0 ([14168be](https://github.com/koatty/koatty_core/commit/14168be))
* 🔧 build: 升级依赖 ([f3d5bbb](https://github.com/koatty/koatty_core/commit/f3d5bbb))
* refactor: 适配app.callback ([9147851](https://github.com/koatty/koatty_core/commit/9147851))



## <small>1.5.2 (2022-02-14)</small>

* 🔧 build: v1.5.2 ([6ec1199](https://github.com/koatty/koatty_core/commit/6ec1199))



## <small>1.5.2-0 (2022-02-14)</small>

* 📃 docs: ([8cc41c6](https://github.com/koatty/koatty_core/commit/8cc41c6))
* 🔧 build: v1.5.2-0 ([a553d99](https://github.com/koatty/koatty_core/commit/a553d99))



## <small>1.5.1-0 (2022-02-14)</small>

* 🎈 perf: ([12c03d9](https://github.com/koatty/koatty_core/commit/12c03d9))
* 🐞 fix: ([de98bdc](https://github.com/koatty/koatty_core/commit/de98bdc))
* 🔧 build: v1.5.1-0 ([a65b7cf](https://github.com/koatty/koatty_core/commit/a65b7cf))



## <small>1.4.14 (2021-12-23)</small>

* 🐞 fix:修复http status 404问题 ([099f3a8](https://github.com/koatty/koatty_core/commit/099f3a8))
* 🐞 fix:修复res参数错误 ([a6902a8](https://github.com/koatty/koatty_core/commit/a6902a8))
* 🔧 build: v1.4.14 ([46539c8](https://github.com/koatty/koatty_core/commit/46539c8))



## <small>1.4.12 (2021-12-21)</small>

* 🔧 build: ([10e9294](https://github.com/koatty/koatty_core/commit/10e9294))
* 🔧 build: v1.4.12 ([133b506](https://github.com/koatty/koatty_core/commit/133b506))



## <small>1.4.10 (2021-12-21)</small>

* 🔧 build: v1.4.10 ([799aff1](https://github.com/koatty/koatty_core/commit/799aff1))
* 🦄 refactor: ([51c3e1c](https://github.com/koatty/koatty_core/commit/51c3e1c))



## <small>1.4.8 (2021-12-21)</small>

* 🔧 build: v1.4.8 ([692a9d2](https://github.com/koatty/koatty_core/commit/692a9d2))



## <small>1.4.6 (2021-12-20)</small>

* 🐞 fix:remove container ([f90cced](https://github.com/koatty/koatty_core/commit/f90cced))
* 🔧 build: v1.4.6 ([0359fa7](https://github.com/koatty/koatty_core/commit/0359fa7))
* 🦄 refactor: ([7b0767e](https://github.com/koatty/koatty_core/commit/7b0767e))



## <small>1.4.4 (2021-12-20)</small>

* 🔧 build: v1.4.4 ([bb46c06](https://github.com/koatty/koatty_core/commit/bb46c06))



## <small>1.4.2 (2021-12-19)</small>

* 🐞 fix: ([f30f8a7](https://github.com/koatty/koatty_core/commit/f30f8a7))
* 🐞 fix: ([08ef35e](https://github.com/koatty/koatty_core/commit/08ef35e))
* 🔧 build: v1.4.2 ([7cfc5c2](https://github.com/koatty/koatty_core/commit/7cfc5c2))
* 🦄 refactor: ([2dd5ad6](https://github.com/koatty/koatty_core/commit/2dd5ad6))



## 1.4.0 (2021-12-18)

* 📃 docs: ([1ee2bd2](https://github.com/koatty/koatty_core/commit/1ee2bd2))
* 🔧 build: ([be17783](https://github.com/koatty/koatty_core/commit/be17783))
* 🔧 build: ([33149e6](https://github.com/koatty/koatty_core/commit/33149e6))
* 🔧 build: v1.4.0 ([96fcdbd](https://github.com/koatty/koatty_core/commit/96fcdbd))



## <small>1.3.38 (2021-11-23)</small>

* chore(release): 1.3.32 ([bcdb320](https://github.com/koatty/koatty_core/commit/bcdb320))
* chore(release): 1.3.36 ([04b234b](https://github.com/koatty/koatty_core/commit/04b234b))
* chore(release): 1.3.38 ([8f72a6f](https://github.com/koatty/koatty_core/commit/8f72a6f))
* ✨ feat:增加logger属性 ([7238bfe](https://github.com/koatty/koatty_core/commit/7238bfe))
* 🐞 fix:remove logger ([a59820e](https://github.com/koatty/koatty_core/commit/a59820e))
* 🐞 fix:接口定义分离 ([077504f](https://github.com/koatty/koatty_core/commit/077504f))
* 🦄 refactor: ([83fbec6](https://github.com/koatty/koatty_core/commit/83fbec6))



## <small>1.3.30 (2021-11-19)</small>

* chore(release): 1.2.22 ([bd1a1a7](https://github.com/koatty/koatty_core/commit/bd1a1a7))
* chore(release): 1.3.16 ([117c9d3](https://github.com/koatty/koatty_core/commit/117c9d3))
* chore(release): 1.3.18 ([47b3a9b](https://github.com/koatty/koatty_core/commit/47b3a9b))
* chore(release): 1.3.26 ([96989bb](https://github.com/koatty/koatty_core/commit/96989bb))
* chore(release): 1.3.30 ([59518d5](https://github.com/koatty/koatty_core/commit/59518d5))
* ✨ feat: add KoattyMetadata ([c352d55](https://github.com/koatty/koatty_core/commit/c352d55))
* ✨ feat: add KoattyMetadata ([4b528de](https://github.com/koatty/koatty_core/commit/4b528de))
* ✨ feat: support grpc、ws context ([8e46b99](https://github.com/koatty/koatty_core/commit/8e46b99))
* 🐞 fix: ([255aec2](https://github.com/koatty/koatty_core/commit/255aec2))
* 🐞 fix: 'pathname' of undefined ([05feb1a](https://github.com/koatty/koatty_core/commit/05feb1a))
* 🐞 fix: proto options ([507fb8c](https://github.com/koatty/koatty_core/commit/507fb8c))
* 🐞 fix: upgrade dep ([2ad3fa8](https://github.com/koatty/koatty_core/commit/2ad3fa8))
* 🐞 fix:Cannot redefine property: metadata ([44b4812](https://github.com/koatty/koatty_core/commit/44b4812))
* 🐞 fix:upgrade ([0f529a7](https://github.com/koatty/koatty_core/commit/0f529a7))
* 🐞 fix:支持grpc metadata ([79c5345](https://github.com/koatty/koatty_core/commit/79c5345))



## <small>1.2.2 (2021-11-12)</small>

* chore(release): 1.2.2 ([eab399a](https://github.com/koatty/koatty_core/commit/eab399a))
* 🐞 fix: KoattyRouterOptions ([f05709a](https://github.com/koatty/koatty_core/commit/f05709a))
* 🐞 fix: ListeningOptions ([8b86916](https://github.com/koatty/koatty_core/commit/8b86916))
* 🐞 fix:add router、server interface ([fbedb2b](https://github.com/koatty/koatty_core/commit/fbedb2b))
* 🐞 fix:add router、server interface ([d0382db](https://github.com/koatty/koatty_core/commit/d0382db))



## <small>1.1.4 (2021-11-11)</small>

* chore(release): 1.1.4 ([476a443](https://github.com/koatty/koatty_core/commit/476a443))
* ✨ feat(): add KoattyNext ([344c528](https://github.com/koatty/koatty_core/commit/344c528))
* 🐞 fix:setMetaData支持属性保护 ([1281ea5](https://github.com/koatty/koatty_core/commit/1281ea5))



## <small>1.1.2 (2021-07-13)</small>

* chore(release): 1.1.2 ([43113e9](https://github.com/koatty/koatty_core/commit/43113e9))
* ✨ feat():first commit ([62afcaf](https://github.com/koatty/koatty_core/commit/62afcaf))



## <small>1.1.1 (2021-07-12)</small>

* chore(release): 1.1.1 ([f1e1cc4](https://github.com/koatty/koatty_core/commit/f1e1cc4))
* Initial commit ([93a3332](https://github.com/koatty/koatty_core/commit/93a3332))
