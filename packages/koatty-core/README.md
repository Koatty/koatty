# Koatty Core

[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![npm version](https://badge.fury.io/js/koatty_core.svg)](https://badge.fury.io/js/koatty_core)

Koatty框架核心模块，基于Koa的Node.js应用框架。

## 特性

- 基于Koa的轻量级核心
- 支持HTTP、gRPC、WebSocket、GraphQL多种协议
- 内置应用生命周期管理
- 强大的中间件支持（Koa + Express）
- 灵活的配置管理
- 完善的错误处理机制
- 请求追踪和性能监控
- 元数据管理

### 性能指标
根据性能测试结果：
- HTTP上下文创建：平均 < 0.1ms/个
- GraphQL上下文创建：平均 < 0.2ms/个  
- 元数据操作：平均 < 0.01ms/次
- 并发处理能力：> 10,000 ops/sec
- 内存使用：10k上下文增长 < 100MB

### 性能测试
运行性能测试：
```bash
npm test -- test/performance.test.ts
```

## API文档

详细API文档请参考: [API文档](./docs/api)

## 贡献指南

欢迎提交Pull Request或报告Issue。在提交代码前请确保:

1. 运行测试: `npm test`
2. 遵循代码风格: `npm run eslint`

## 许可证

BSD 3-Clause License

Copyright (c) 2020-present, richenlin@gmail.com
