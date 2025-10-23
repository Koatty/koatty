/**
 * 
 */

// jest详细配置参见:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // 测试用例运行环境
  moduleDirectories: ["node_modules", "src"],
  transform: {
    "^.+\\.(js|ts)?$": ['ts-jest', {
      // 编译 Typescript 所依赖的配置
      tsconfig: '<rootDir>/tsconfig.json',
      // 是否启用报告诊断，这里是不启用
      diagnostics: false,
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
};
