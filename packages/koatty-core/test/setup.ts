// 全局测试设置
beforeEach(() => {
  // 清理控制台mock以避免干扰
  jest.clearAllMocks();
});

afterEach(() => {
  // 清理所有可能的资源
  jest.restoreAllMocks();
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  if ((reason as any)?.prevent) {
    // 忽略标记为prevented的错误
    return;
  }
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  if ((error as any)?.prevent) {
    // 忽略标记为prevented的错误
    return;
  }
  console.error('Uncaught Exception:', error);
});

// 设置较短的超时以避免测试挂起
jest.setTimeout(10000); 