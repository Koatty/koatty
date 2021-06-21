/**
 * 
 */

// jest详细配置参见:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  testEnvironment: 'node', // 测试用例运行环境
  testMatch: ['<rootDir>/test/**/*.(spec|test).[jt]s'], // 匹配测试用例的路径规则
  reporters: [
    'default',
    'jest-html-reporters'
  ], // 测试用例报告
  collectCoverage: true, // 是否收集测试时的覆盖率信息
  coverageReporters: ['html', 'lcov', 'json', 'text', 'clover', 'text-summary'], // 收集测试时的覆盖率信息
};
