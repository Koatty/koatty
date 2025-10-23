/**
 * 
 */

// jest详细配置参见:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // 测试用例运行环境
  forceExit: true, // 强制退出挂起的测试
  maxWorkers: '50%', // 限制并发 worker 数量,避免资源竞争
  workerIdleMemoryLimit: '512MB', // 设置 worker 内存限制
  moduleDirectories: ["node_modules", "src"],
  transform: {
    "^.+\\.(js|ts)?$": ['ts-jest', {
      // 编译 Typescript 所依赖的配置
      tsconfig: '<rootDir>/tsconfig.json',
      // 是否启用报告诊断，这里是不启用
      diagnostics: false,
      isolatedModules: true, // 启用隔离模块编译,提高性能
    }],
  },
  transformIgnorePatterns: ["<rootDir>/node_modules/"],
  testMatch: ['<rootDir>/test/**/*.(spec|test).[jt]s'], // 匹配测试用例的路径规则
  reporters: [
    'default',
    'jest-html-reporters'
  ], // 测试用例报告
  collectCoverage: true, // 是否收集测试时的覆盖率信息
  coverageReporters: [
    'html',
    'lcov',
    'json',
    'text',
    'clover',
    'text-summary',
  ], // 收集测试时的覆盖率信息
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'], // 测试环境设置
  globalTeardown: '<rootDir>/test/teardown.ts', // 全局清理
  testTimeout: 30000, // 增加测试超时时间到 30 秒
  bail: false, // 不要在第一个失败时停止
};
