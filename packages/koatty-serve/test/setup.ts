// test/setup.ts - Jest测试环境设置
import { generateTestCertificates } from './utils/cert-generator';

// 在测试开始前生成测试证书
generateTestCertificates();

// 增加进程事件监听器限制
process.setMaxListeners(0);

// 🔧 使用 Jest 假定时器避免真实定时器的资源泄漏
jest.useFakeTimers({
  advanceTimers: true,
  doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout']
});

// 在每个测试前清理
beforeEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});

// 在每个测试后清理定时器和事件监听器
afterEach(async () => {
  // 清理所有定时器
  jest.clearAllTimers();
  jest.clearAllMocks();
  
  // 给异步操作时间完成
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
}, 10000);

// 在每个测试套件后确保资源清理
afterAll(async () => {
  try {
    // 先清理所有定时器
    jest.clearAllTimers();
    // 恢复真实定时器
    jest.useRealTimers();
    // 等待所有异步操作完成
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    // 忽略定时器清理错误
    if (error && typeof error === 'object' && 'message' in error) {
      console.warn('Timer cleanup warning:', (error as Error).message);
    }
  }
}, 15000);