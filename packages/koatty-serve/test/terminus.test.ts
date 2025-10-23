/**
 * Terminus 优雅关闭测试
 * 验证 appStop 事件触发时 destroy 方法被正确调用
 */

import { EventEmitter } from 'events';
import { KoattyApplication, KoattyServer } from 'koatty_core';
import { onSignal } from '../src/utils/terminus';

describe('Terminus Graceful Shutdown', () => {
  let mockApp: KoattyApplication;
  let mockServer: any;
  let destroyCalled: boolean;
  let stopCalled: boolean;
  let appStopCalled: boolean;

  beforeEach(() => {
    destroyCalled = false;
    stopCalled = false;
    appStopCalled = false;

    // 创建模拟的 app
    mockApp = new EventEmitter() as any;
    mockApp.on('appStop', () => {
      appStopCalled = true;
    });

    // 创建模拟的 server
    mockServer = {
      status: 200,
      destroy: jest.fn().mockImplementation(async () => {
        destroyCalled = true;
        return {
          status: 'completed',
          totalTime: 100,
          completedSteps: ['test'],
          failedSteps: []
        };
      }),
      Stop: jest.fn().mockImplementation((callback?: Function) => {
        stopCalled = true;
        if (callback) callback();
      })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('appStop 事件触发后应该调用 destroy', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      await onSignal('SIGTERM', mockApp, mockServer as KoattyServer, 5000);
    } catch (error: any) {
      if (error.message === 'process.exit called') {
        // 预期的退出
      } else {
        throw error;
      }
    }

    expect(appStopCalled).toBe(true);
    expect(destroyCalled).toBe(true);
    expect(mockServer.destroy).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);

    mockExit.mockRestore();
  });

  test('当 destroy 不存在时应该降级到 Stop 方法', async () => {
    // 移除 destroy 方法
    delete mockServer.destroy;

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      await onSignal('SIGTERM', mockApp, mockServer as KoattyServer, 5000);
    } catch (error: any) {
      if (error.message === 'process.exit called') {
        // 预期的退出
      } else {
        throw error;
      }
    }

    expect(appStopCalled).toBe(true);
    expect(stopCalled).toBe(true);
    expect(mockServer.Stop).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);

    mockExit.mockRestore();
  });

  test('destroy 失败时应该正确处理错误', async () => {
    mockServer.destroy = jest.fn().mockRejectedValue(new Error('Destroy failed'));

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    try {
      await onSignal('SIGTERM', mockApp, mockServer as KoattyServer, 5000);
    } catch (error: any) {
      if (error.message === 'process.exit called') {
        // 预期的退出
      } else {
        throw error;
      }
    }

    expect(appStopCalled).toBe(true);
    expect(mockServer.destroy).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1); // 失败时退出码为 1

    mockExit.mockRestore();
  });

  test('超时时应该强制关闭', async () => {
    // 使用实际定时器以避免复杂的fake timer问题
    jest.useRealTimers();
    
    mockServer.destroy = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        // 延迟2秒才resolve，确保超过100ms的timeout
        setTimeout(resolve, 2000);
      });
    });

    let exitCalled = false;
    let exitCode: number | undefined;
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
      exitCalled = true;
      exitCode = code as number;
      // 不抛出错误，只记录调用
      return undefined as never;
    });

    // 调用onSignal，不等待完成（因为process.exit会中断）
    const promise = onSignal('SIGTERM', mockApp, mockServer as KoattyServer, 100); // 100ms超时
    
    // 等待足够长的时间让超时触发
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(exitCalled).toBe(true);
    expect(exitCode).toBe(1); // 超时强制退出码为 1

    mockExit.mockRestore();
    
    // 恢复 fake timers
    jest.useFakeTimers({
      advanceTimers: true,
      doNotFake: ['nextTick', 'setImmediate', 'clearImmediate']
    });
  }, 10000); // 给测试本身足够的时间
});

