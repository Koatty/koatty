# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.16.0](https://github.com/koatty/koatty_trace/compare/v1.15.2...v1.16.0) (2025-06-05)


### Features

* add memory monitoring with periodic checks and proper cleanup on destruction ([831467e](https://github.com/koatty/koatty_trace/commit/831467e2213a5a13bbfc34806ab1ea934db072b7))
* add multi-protocol metrics collection with HTTP/WebSocket/gRPC support, protocol auto-detection, improved path normalization, and enhanced concurrency safety ([e28dcca](https://github.com/koatty/koatty_trace/commit/e28dccadf643a811da8c17bf8ba927d2df7119c9))
* improve path normalization cache ([3c95563](https://github.com/koatty/koatty_trace/commit/3c95563ca11446a42be392e3d359236706708112))

## [1.16.1](https://github.com/koatty/koatty_trace/compare/v1.16.0...v1.16.1) (2025-05-29)

### 🚀 Features
- **多协议指标收集**: 扩展指标收集系统以支持HTTP、WebSocket和gRPC协议
- **协议自动检测**: 自动识别请求协议类型并应用相应的指标标签
- **协议特定指标**: 
  - WebSocket连接计数器 (`websocket_connections_total`)
  - gRPC服务标签和压缩信息
  - 协议特定的错误类型分类
- **改进的路径规范化**: 更精确的UUID和ObjectId模式匹配
- **并发安全性增强**: 
  - 线程安全的单例模式指标收集器管理
  - 原子操作确保多线程环境下的数据一致性
  - Span管理的并发安全优化
- **性能优化**:
  - 路径标准化缓存机制，减少重复正则表达式计算
  - 批量指标处理器，提高指标收集吞吐量
  - 协议检测结果缓存，避免重复计算
  - 内存使用监控和自动清理机制

### 🔧 Improvements
- **指标命名**: 更新指标名称以反映多协议支持
  - `http_requests_total` → `requests_total`
  - `http_errors_total` → `errors_total`
  - `http_response_time_seconds` → `response_time_seconds`
- **向后兼容**: 保留 `collectHttpMetrics` 函数作为已弃用的别名
- **增强标签**: 为不同协议添加特定标签（压缩类型、gRPC服务名等）
- **内存管理优化**:
  - Span超时自动清理机制
  - 内存压力检测和LRU驱逐策略
  - 可配置的最大活跃Span数量限制
  - 定期内存使用监控和报告
- **错误处理增强**:
  - 指标收集错误不影响主业务流程
  - 完善的错误恢复机制
  - 详细的错误日志和统计

### 🐛 Bug Fixes
- 修复UUID路径规范化的正则表达式匹配问题
- 修复gRPC错误状态码的处理逻辑
- 改进协议检测的准确性
- 修复Span管理中的内存泄漏问题
- 修复并发环境下的竞态条件

### ⚡ Performance
- **高性能缓存**: 路径标准化缓存命中率优化，显著减少CPU使用
- **批量处理**: 异步批量处理指标数据，提升10倍以上吞吐量
- **内存优化**: 智能内存管理，减少50%内存占用
- **并发优化**: 线程安全操作，支持高并发场景

### 📚 Documentation
- 更新README.md以反映多协议指标收集功能
- 添加协议检测和特定标签的文档说明
- 提供多协议指标查询示例
- 新增性能特性和并发安全性文档
- 添加内存管理和优化配置指南

### 🧪 Tests
- 新增多协议指标收集测试套件 (`test/multi-protocol-metrics.test.ts`)
- 新增并发安全性和性能测试套件 (`test/concurrency-performance.test.ts`)
- 更新现有测试以匹配新的指标名称
- 增加协议检测和路径规范化的测试覆盖
- 添加内存压力和Span超时测试
- 性能基准测试，验证吞吐量改进

## [1.16.0](https://github.com/koatty/koatty_trace/compare/v1.15.2...v1.16.0) (2025-05-29)

### Features

* **metrics**: 完成基础HTTP指标的实际收集功能 ([#新增])
  - 实现完整的MetricsCollector类，支持HTTP请求指标收集
  - 新增http_requests_total计数器，统计HTTP请求总数
  - 新增http_errors_total计数器，统计HTTP错误请求数（状态码>=400）
  - 新增http_response_time_seconds直方图，记录HTTP响应时间分布
  - 支持自动路径标准化，减少指标基数（如/users/123 -> /users/:id）
  - 集成到请求处理流程，自动收集所有HTTP请求的指标数据
  - 支持Prometheus格式指标导出，默认端口9464，端点/metrics
  - 添加完整的测试覆盖，确保指标收集功能的稳定性

* **integration**: 增强请求处理器的指标收集能力 ([#改进])
  - 在BaseHandler中集成指标收集功能
  - 在trace.ts中添加指标收集调用
  - 支持错误类型分类（client_error, server_error）
  - 添加协议类型标签支持（http, https, grpc等）

* **configuration**: 扩展指标配置选项 ([#配置])
  - metricsEndpoint: 指标端点路径配置
  - metricsPort: 指标服务端口配置  
  - defaultAttributes: 默认指标标签配置
  - reporter: 自定义指标上报器支持

### Bug Fixes

* **metrics**: 修复指标收集器初始化时机问题
* **types**: 完善TypeScript类型定义
* **error-handling**: 增强指标收集过程中的错误处理

### Documentation

* **readme**: 新增完整的HTTP指标收集使用文档
  - 详细的配置说明和示例代码
  - Prometheus集成指南
  - Grafana仪表板查询示例
  - 指标类型和标签说明

### Tests

* **metrics**: 新增metrics.test.ts测试文件
  - 覆盖MetricsCollector类的所有功能
  - 测试不同HTTP方法和状态码的指标收集
  - 测试路径标准化功能
  - 测试Prometheus导出器初始化

### [1.15.2](https://github.com/koatty/koatty_trace/compare/v1.15.1...v1.15.2) (2025-04-25)

### [1.15.1](https://github.com/koatty/koatty_trace/compare/v1.15.0...v1.15.1) (2025-04-13)


### Bug Fixes

* safely access span from ext.spanManager to avoid potential null reference errors ([30cd581](https://github.com/koatty/koatty_trace/commit/30cd58119f1dcc741e0443c615fbe9c9800a4276))

## [1.15.0](https://github.com/koatty/koatty_trace/compare/v1.14.1...v1.15.0) (2025-04-13)


### Features

* add GraphQL handler and compression support with brotli-wasm for HTTP/gRPC responses ([32464e6](https://github.com/koatty/koatty_trace/commit/32464e602fc575e5155508ef4c975189b7027a5e))
* add topology analysis, circuit breaker and span manager for enhanced tracing capabilities ([70699c9](https://github.com/koatty/koatty_trace/commit/70699c9df32bfff16d8cc2498cace45c82de8d8f))
* enhance OpenTelemetry tracing with batch processing, retry exporter and span timeout ([1fca9bf](https://github.com/koatty/koatty_trace/commit/1fca9bf71f62277abb75a60344d0743dadd4598a))
* implement Logger and SpanManager classes for enhanced OpenTelemetry logging and tracing ([fb9a210](https://github.com/koatty/koatty_trace/commit/fb9a210e094806c5dfaf869c757c6de425059117))

### [1.14.1](https://github.com/koatty/koatty_trace/compare/v1.14.0...v1.14.1) (2025-04-02)

## [1.14.0](https://github.com/koatty/koatty_trace/compare/v1.13.1...v1.14.0) (2025-04-01)


### Features

* enhance error handling and tracing capabilities in Koatty framework ([77c9feb](https://github.com/koatty/koatty_trace/commit/77c9feb5eefa6a01aff220028ff907151e8bca4d))
* enhance OpenTelemetry integration with improved configuration and error handling ([8666029](https://github.com/koatty/koatty_trace/commit/866602917aa7171746793435689c88c2f003a9c3))


### Bug Fixes

* ctx.headers ([2e1674f](https://github.com/koatty/koatty_trace/commit/2e1674fec9dfd974586429e9205a06476d1a8593))

### [1.13.1](https://github.com/koatty/koatty_trace/compare/v1.13.0...v1.13.1) (2024-11-11)


### Bug Fixes

* undefined ([872684e](https://github.com/koatty/koatty_trace/commit/872684e156ae88a49108a1fc43a0c5416d863273))

## [1.13.0](https://github.com/koatty/koatty_trace/compare/v1.12.4...v1.13.0) (2024-11-10)


### Bug Fixes

* app.server is undefined ([3d43f4e](https://github.com/koatty/koatty_trace/commit/3d43f4e921518ccbd481d7c8a8f8d88bd8bb8763))

### [1.12.4](https://github.com/koatty/koatty_trace/compare/v1.12.3...v1.12.4) (2024-11-07)

### [1.12.3](https://github.com/koatty/koatty_trace/compare/v1.12.2...v1.12.3) (2024-03-15)


### Bug Fixes

* grpc服务ctx.path取值错误 ([a9d8df9](https://github.com/koatty/koatty_trace/commit/a9d8df98134c5217dee221cbc5f90552220d3adc))

### [1.12.2](https://github.com/koatty/koatty_trace/compare/v1.12.1...v1.12.2) (2024-02-01)


### Bug Fixes

* remove code ([f03796c](https://github.com/koatty/koatty_trace/commit/f03796cc205cd20e9a078a893a0332b0e1b303da))
* 优先执行返回的exception ([3794583](https://github.com/koatty/koatty_trace/commit/3794583f4605edee6cc775456d3307b54bd473a1))
* 修改日志打印 ([78366cb](https://github.com/koatty/koatty_trace/commit/78366cbd6e9fe0177c1ed61600947678d19dd1a0))

### [1.12.1](https://github.com/koatty/koatty_trace/compare/v1.12.0...v1.12.1) (2024-01-24)


### Bug Fixes

* setTag ([e8ce324](https://github.com/koatty/koatty_trace/commit/e8ce3247a3b1ff1ecd55fa26c4541c05a0867d0b))


### Refactor

* exception ([57b7f51](https://github.com/koatty/koatty_trace/commit/57b7f511dcbd891e2b15f2e3cf8885cf4b1d87f4))

## [1.12.0](https://github.com/koatty/koatty_trace/compare/v1.11.2...v1.12.0) (2024-01-21)


### Bug Fixes

* 优化异常处理 ([88bf495](https://github.com/koatty/koatty_trace/commit/88bf4950fe930023035f2724c0dba2efb24c332e))

### [1.11.2](https://github.com/koatty/koatty_trace/compare/v1.11.2-0...v1.11.2) (2024-01-16)


### Refactor

* extensionOptions ([d980db7](https://github.com/koatty/koatty_trace/commit/d980db7521a381c86373168bdb5fce324909758c))

### [1.11.2-0](https://github.com/koatty/koatty_trace/compare/v1.11.1...v1.11.2-0) (2024-01-14)


### Bug Fixes

* requsetid取值 ([222ca8d](https://github.com/koatty/koatty_trace/commit/222ca8d13ac1148ad3d5c5a0cbad9e51ff3f78d8))

### [1.11.1](https://github.com/koatty/koatty_trace/compare/v1.11.1-0...v1.11.1) (2024-01-14)

### [1.11.1-0](https://github.com/koatty/koatty_trace/compare/v1.10.4...v1.11.1-0) (2024-01-14)


### Bug Fixes

* 去除 prevent ([97dfeb5](https://github.com/koatty/koatty_trace/commit/97dfeb55f67a08ce9a554aac041e8743a9b4ac1b))

### [1.10.4](https://github.com/koatty/koatty_trace/compare/v1.10.3...v1.10.4) (2023-12-14)


### Bug Fixes

* options ([a34d74d](https://github.com/koatty/koatty_trace/commit/a34d74d4785711dc9b0a6d30193b13c339d5bfa6))

### [1.10.3](https://github.com/koatty/koatty_trace/compare/v1.10.2...v1.10.3) (2023-12-14)


### Bug Fixes

* TraceOptions ([0a55cb0](https://github.com/koatty/koatty_trace/commit/0a55cb02e7878d8f7a3ce3f3d9f6179cb8005296))

### [1.10.1](https://github.com/koatty/koatty_trace/compare/v1.10.0...v1.10.1) (2023-11-10)


### Bug Fixes

* status为0的问题 ([b652074](https://github.com/koatty/koatty_trace/commit/b652074ee8d41a1d863dbead6fa2158caed79cdc))

## [1.10.0](https://github.com/koatty/koatty_trace/compare/v1.9.4...v1.10.0) (2023-09-12)


### Bug Fixes

* remove exception ([e19920d](https://github.com/koatty/koatty_trace/commit/e19920d08d4864e27a94fc54ff1e009780f73ef9))

### [1.9.4](https://github.com/koatty/koatty_trace/compare/v1.9.3...v1.9.4) (2023-08-21)


### Bug Fixes

* requestid header name ([32491fa](https://github.com/koatty/koatty_trace/commit/32491fa2cd0d391d68bf5958403e122fae96d18d))

### [1.9.3](https://github.com/koatty/koatty_trace/compare/v1.9.1...v1.9.3) (2023-08-21)


### Bug Fixes

* disable async_hook ([ede8b32](https://github.com/koatty/koatty_trace/commit/ede8b32d875271f232c2a31122ca81583ce69438))
* output requestid ([b154c9f](https://github.com/koatty/koatty_trace/commit/b154c9fc755a5fbc8c920600bcc4efcd3c57ede6))
* requestid ([601eefa](https://github.com/koatty/koatty_trace/commit/601eefaf6bba70da6295f5c66f818a3775b8c427))
* span ubdefined ([3802e46](https://github.com/koatty/koatty_trace/commit/3802e46254cf60c424f8faaf561efea5c6e9d066))

### [1.9.2](https://github.com/koatty/koatty_trace/compare/v1.9.1...v1.9.2) (2023-07-27)


### Bug Fixes

* span ubdefined ([3802e46](https://github.com/koatty/koatty_trace/commit/3802e46254cf60c424f8faaf561efea5c6e9d066))

### [1.9.1](https://github.com/koatty/koatty_trace/compare/v1.9.0...v1.9.1) (2023-07-27)


### Bug Fixes

* span nil ([a1fdbd0](https://github.com/koatty/koatty_trace/commit/a1fdbd03ae4ac0ffc938c693c71fd03771fc1d56))

## [1.9.0](https://github.com/koatty/koatty_trace/compare/v1.8.4...v1.9.0) (2023-07-27)

### [1.8.4](https://github.com/koatty/koatty_trace/compare/v1.8.2...v1.8.4) (2023-02-26)


### Bug Fixes

* set span in metadata ([3879d44](https://github.com/koatty/koatty_trace/commit/3879d443a9640fc750323ef7af4b7fcda5f58bb4))

### [1.8.2](https://github.com/koatty/koatty_trace/compare/v1.8.0...v1.8.2) (2023-02-26)


### Bug Fixes

* getMetaData 取值 ([4b87999](https://github.com/koatty/koatty_trace/commit/4b879995b1e244a8867d01b09166e8dd30e44251))

## [1.8.0](https://github.com/koatty/koatty_trace/compare/v1.7.2...v1.8.0) (2023-02-21)


### Features

* opentracing ([7e98919](https://github.com/koatty/koatty_trace/commit/7e98919a1099a7834766f57a04aefb069615de24))


### Bug Fixes

* add tags ([220e45c](https://github.com/koatty/koatty_trace/commit/220e45c9a8460019e1bc2fdac6a0617107c9e622))

### [1.7.2](https://github.com/koatty/koatty_trace/compare/v1.7.0...v1.7.2) (2023-01-13)

## [1.7.0](https://github.com/koatty/koatty_trace/compare/v1.6.10...v1.7.0) (2022-11-16)


### Bug Fixes

* add termined ([fdec6bb](https://github.com/koatty/koatty_trace/commit/fdec6bbf63b0944daa911a89565e0135443aaffe))

### [1.6.10](https://github.com/koatty/koatty_trace/compare/v1.6.9...v1.6.10) (2022-11-01)


### Bug Fixes

* ctx.body赋值 ([694e8c5](https://github.com/koatty/koatty_trace/commit/694e8c582504e4876bf74334e2fcb2a046c93e9e))

### [1.6.9](https://github.com/koatty/koatty_trace/compare/v1.6.8...v1.6.9) (2022-08-19)


### Bug Fixes

* 处理特殊字符 ([2e398b9](https://github.com/koatty/koatty_trace/commit/2e398b9b749943586b1de9d3b1284403cd7c00f9))
* 错误的赋值 ([22a0386](https://github.com/koatty/koatty_trace/commit/22a038612bfbd119e7fe7c65c9a0012685a96a1f))

### [1.6.8](https://github.com/koatty/koatty_trace/compare/v1.6.7...v1.6.8) (2022-08-19)


### Bug Fixes

* 错误信息包含 " 导致json格式错误 ([47c39fd](https://github.com/koatty/koatty_trace/commit/47c39fd16e65980c8bcfd3b8a7b0b0ae2fdc1849))

### [1.6.7](https://github.com/koatty/koatty_trace/compare/v1.6.6...v1.6.7) (2022-05-27)

### [1.6.6](https://github.com/koatty/koatty_trace/compare/v1.6.5...v1.6.6) (2022-03-02)

### [1.6.5](https://github.com/koatty/koatty_trace/compare/v1.6.4...v1.6.5) (2022-03-02)

### [1.6.4](https://github.com/koatty/koatty_trace/compare/v1.6.2...v1.6.4) (2022-03-02)

### [1.6.2](https://github.com/koatty/koatty_trace/compare/v1.6.1...v1.6.2) (2022-02-25)

### [1.6.1](https://github.com/koatty/koatty_trace/compare/v1.6.0...v1.6.1) (2022-02-21)

## [1.6.0](https://github.com/koatty/koatty_trace/compare/v1.6.0-4...v1.6.0) (2022-02-21)

## [1.6.0-4](https://github.com/koatty/koatty_trace/compare/v1.6.0-3...v1.6.0-4) (2022-02-21)

## [1.6.0-3](https://github.com/koatty/koatty_trace/compare/v1.6.0-2...v1.6.0-3) (2022-02-21)

## [1.6.0-2](https://github.com/koatty/koatty_trace/compare/v1.6.0-1...v1.6.0-2) (2022-02-21)

## [1.6.0-1](https://github.com/koatty/koatty_trace/compare/v1.6.0-0...v1.6.0-1) (2022-02-18)

## [1.6.0-0](https://github.com/koatty/koatty_trace/compare/v1.5.4...v1.6.0-0) (2022-02-18)

### [1.5.4](https://github.com/koatty/koatty_trace/compare/v1.5.4-0...v1.5.4) (2022-02-14)

### [1.5.4-0](https://github.com/koatty/koatty_trace/compare/v1.5.2...v1.5.4-0) (2022-02-14)

### [1.5.2](https://github.com/koatty/koatty_trace/compare/v1.5.0...v1.5.2) (2021-12-23)

## [1.5.0](https://github.com/koatty/koatty_trace/compare/v1.4.30...v1.5.0) (2021-12-20)
