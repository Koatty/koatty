# koatty_exception

[![npm version](https://badge.fury.io/js/koatty_exception.svg)](https://badge.fury.io/js/koatty_exception)
[![Build Status](https://github.com/koatty/koatty_exception/workflows/CI/badge.svg)](https://github.com/koatty/koatty_exception/actions)
[![Test Coverage](https://codecov.io/gh/koatty/koatty_exception/branch/main/graph/badge.svg)](https://codecov.io/gh/koatty/koatty_exception)
[![License](https://img.shields.io/npm/l/koatty_exception.svg)](LICENSE)

**koatty_exception** 是 Koatty 框架的异常处理模块，提供了统一的错误处理机制、响应格式化和多协议支持。

## ✨ 特性

- 🎯 **统一异常处理** - 提供标准化的异常处理机制
- 🔗 **链式调用** - 支持方法链式调用，代码更优雅
- 🌐 **多协议支持** - 支持 HTTP、gRPC、WebSocket 多种协议
- 📊 **可观测性** - 集成 OpenTelemetry 链路追踪
- 🔧 **高度可配置** - 支持自定义日志格式、错误响应格式等
- 📝 **TypeScript 支持** - 完整的类型定义和类型安全
- 🚀 **零依赖核心** - 核心功能无外部依赖
- 📦 **装饰器模式** - 使用 `@ExceptionHandler` 装饰器注册异常处理器

## 📦 安装

```bash
npm install koatty_exception

# 或使用 yarn
yarn add koatty_exception

# 或使用 pnpm
pnpm add koatty_exception
```

## 🚀 快速开始

### 基础用法

```typescript
import { Exception, Output, CommonErrorCode } from 'koatty_exception';

// 创建基础异常
const error = new Exception('用户未找到', CommonErrorCode.RESOURCE_NOT_FOUND, 404);

// 链式调用设置异常属性
const customError = new Exception('验证失败')
  .setCode(CommonErrorCode.VALIDATION_ERROR)
  .setStatus(400)
  .setContext({
    requestId: 'req-123',
    path: '/api/users',
    method: 'POST'
  });

// 使用 Output 类格式化响应
const successResponse = Output.ok('操作成功', { id: 1, name: '张三' });
const errorResponse = Output.fail('操作失败', null, 1001);
```

### 自定义异常处理器

```typescript
import { Exception, ExceptionHandler } from 'koatty_exception';
import { KoattyContext } from 'koatty_core';

@ExceptionHandler()
export class ValidationException extends Exception {
  constructor(message: string, field?: string) {
    super(message, CommonErrorCode.VALIDATION_ERROR, 400);
    
    if (field) {
      this.setContext({ field });
    }
  }

  async handler(ctx: KoattyContext): Promise<any> {
    // 自定义处理逻辑
    const response = {
      error: 'VALIDATION_ERROR',
      message: this.message,
      field: this.context?.field,
      timestamp: new Date().toISOString()
    };
    
    ctx.status = this.status;
    ctx.type = 'application/json';
    return ctx.res.end(JSON.stringify(response));
  }
}

// 使用自定义异常
throw new ValidationException('邮箱格式不正确', 'email');
```

### 全局配置

```typescript
import { setExceptionConfig } from 'koatty_exception';

// 配置异常处理行为
setExceptionConfig({
  enableStackTrace: process.env.NODE_ENV !== 'production',
  logFormat: 'json',
  maxStackLength: 1000,
  customErrorFormat: (error) => ({
    errorId: generateErrorId(),
    type: error.constructor.name,
    message: error.message,
    timestamp: new Date().toISOString()
  })
});
```

## 📚 API 文档

### Exception 类

#### 构造函数

```typescript
constructor(message: string, code?: number, status?: number, stack?: string, span?: Span)
```

#### 方法

##### setCode(code: number): this
设置错误代码（必须为非负整数）

##### setStatus(status: number): this
设置 HTTP 状态码（必须在 100-599 范围内）

##### setMessage(message: string): this
设置错误消息

##### setContext(context: Partial<ErrorContext>): this
设置错误上下文信息

##### setSpan(span: Span): this
设置 OpenTelemetry 跟踪 span

##### async handler(ctx: KoattyContext): Promise<any>
处理异常并返回响应

##### toJSON(): object
将异常转换为普通对象

### Output 类

#### 静态方法

##### ok<T>(message: string | JsonResult<T>, data?: T, code?: number): JsonResult<T>
创建成功响应

```typescript
// 基础用法
Output.ok('操作成功', { id: 1 });
// 结果: { code: 0, message: '操作成功', data: { id: 1 } }

// 自定义代码
Output.ok('创建成功', newUser, 201);
```

##### fail<T>(err?: Error | CodeError | string | unknown, data?: T, code?: number): JsonResult<T>
创建失败响应

```typescript
// 使用错误对象
Output.fail(new Error('数据库连接失败'));

// 使用字符串
Output.fail('参数无效', null, 1001);

// 使用 CodeError 对象
Output.fail({ code: 1002, message: '权限不足', data: { required: 'admin' } });
```

##### paginate<T>(items: T[], total: number, page: number, pageSize: number, message?: string): JsonResult
创建分页响应

```typescript
const users = [/* 用户列表 */];
const response = Output.paginate(users, 100, 2, 10, '用户列表');
// 包含 pagination 信息：{ total, page, pageSize, totalPages, hasNext, hasPrev }
```

##### withMeta<T>(message: string, data: T, meta?: Record<string, unknown>, code?: number): JsonResult
创建带元数据的响应

```typescript
Output.withMeta('查询成功', userData, {
  version: '1.0',
  executionTime: 120,
  cached: true
});
```

### 工具函数

#### prevent(): Promise<never>
创建一个用于阻止下一步处理的 Promise

#### isPrevent(err: unknown): err is Error
检查是否为阻止处理的错误

#### isException(err: unknown): err is Exception
类型保护函数，检查是否为 Exception 实例

#### toSafeError(err: unknown): Error
将任意值转换为安全的 Error 对象

#### isNetworkError(err: unknown): boolean
检查是否为网络相关错误

## 🔧 配置选项

```typescript
interface ExceptionConfig {
  enableStackTrace?: boolean;    // 是否启用堆栈跟踪（默认：非生产环境启用）
  logFormat?: 'json' | 'text';  // 日志格式（默认：json）
  customErrorFormat?: (error: Exception) => any; // 自定义错误格式化函数
  maxStackLength?: number;       // 最大堆栈长度（默认：1000）
}
```

## 🏗️ 高级用法

### 1. 自定义业务异常

```typescript
@ExceptionHandler()
export class BusinessException extends Exception {
  constructor(message: string, businessCode: string) {
    super(message, CommonErrorCode.GENERAL_ERROR, 400);
    this.setContext({ businessCode });
  }
}

@ExceptionHandler()
export class AuthenticationException extends Exception {
  constructor(message: string = '身份验证失败') {
    super(message, CommonErrorCode.AUTHENTICATION_ERROR, 401);
  }
  
  async handler(ctx: KoattyContext): Promise<any> {
    // 清除认证信息
    ctx.cookies.set('token', null);
    return super.handler(ctx);
  }
}
```

### 2. 错误聚合和统计

```typescript
export class ErrorCollector {
  private static errors: Map<string, number> = new Map();
  
  static record(error: Exception): void {
    const key = `${error.constructor.name}:${error.code}`;
    this.errors.set(key, (this.errors.get(key) || 0) + 1);
  }
  
  static getStats(): Record<string, number> {
    return Object.fromEntries(this.errors);
  }
}

// 在异常处理器中使用
@ExceptionHandler()
export class MonitoredException extends Exception {
  async handler(ctx: KoattyContext): Promise<any> {
    ErrorCollector.record(this);
    return super.handler(ctx);
  }
}
```

### 3. 异步错误处理

```typescript
import { prevent, isPrevent } from 'koatty_exception';

async function processData() {
  try {
    const shouldStop = await checkCondition();
    if (shouldStop) {
      await prevent(); // 阻止后续处理
    }
    
    // 继续处理...
  } catch (error) {
    if (isPrevent(error)) {
      console.log('处理被阻止');
      return;
    }
    throw error; // 重新抛出其他错误
  }
}
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:cov

# 运行 ESLint 检查
npm run eslint
```

## 📊 错误代码参考

```typescript
export enum CommonErrorCode {
  SUCCESS = 0,                    // 成功
  GENERAL_ERROR = 1,              // 通用错误
  VALIDATION_ERROR = 1001,        // 验证失败
  AUTHENTICATION_ERROR = 1002,    // 身份验证失败
  AUTHORIZATION_ERROR = 1003,     // 权限不足
  RESOURCE_NOT_FOUND = 1004,      // 资源未找到
  RESOURCE_CONFLICT = 1005,       // 资源冲突
  RATE_LIMIT_EXCEEDED = 1006,     // 请求频率超限
  INTERNAL_SERVER_ERROR = 1007,   // 内部服务器错误
  SERVICE_UNAVAILABLE = 1008,     // 服务不可用
  TIMEOUT_ERROR = 1009,           // 超时错误
  NETWORK_ERROR = 1010            // 网络错误
}
```

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md) 了解详情。

### 开发步骤

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目基于 [BSD-3-Clause](LICENSE) 许可证开源。

## 🔗 相关链接

- [Koatty 框架](https://github.com/koatty/koatty)
- [API 文档](https://koatty.github.io/koatty_exception/)
- [更新日志](CHANGELOG.md)
- [问题反馈](https://github.com/koatty/koatty_exception/issues)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！
