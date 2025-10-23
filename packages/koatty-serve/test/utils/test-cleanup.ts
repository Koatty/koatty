/*
 * @Description: 测试资源清理工具
 * @Usage: 确保测试后完整清理资源，避免资源泄漏和测试间干扰
 * @Author: richen
 * @Date: 2024-11-27 20:30:00
 * @LastEditTime: 2024-11-27 20:30:00
 */

import { globalTimerManager } from "../../src/utils/timer-manager";

/**
 * 测试资源管理器
 * 统一管理测试过程中的资源创建和清理
 */
export class TestResourceManager {
  private static isCleaningUp = false;
  private static cleanupCallbacks: Array<() => Promise<void> | void> = [];

  /**
   * 注册清理回调
   * @param callback 清理回调函数
   */
  static registerCleanupCallback(callback: () => Promise<void> | void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * 完整的测试资源清理
   * 在每个测试后调用，确保资源完全释放
   */
  static async cleanupTestResources(): Promise<void> {
    if (this.isCleaningUp) {
      return; // 避免重复清理
    }

    this.isCleaningUp = true;

    try {
      // 1. 执行用户注册的清理回调
      for (const callback of this.cleanupCallbacks) {
        try {
          await callback();
        } catch (error) {
          console.warn('Cleanup callback error:', error);
        }
      }

      // 2. 清理全局定时器
      globalTimerManager.clearAllTimers();

      // 3. 清理Jest定时器
      if (jest && jest.clearAllTimers) {
        jest.clearAllTimers();
      }

      // 4. 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 50));

      // 5. 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }

      // 6. 清理进程事件监听器（谨慎操作，只清理非核心监听器）
      this.cleanupEventListeners();

      // 7. 等待额外的清理时间
      await new Promise(resolve => setTimeout(resolve, 10));

    } finally {
      this.isCleaningUp = false;
    }
  }

  /**
   * 快速清理（轻量级）
   * 适用于不需要完整清理的场景
   */
  static async quickCleanup(): Promise<void> {
    // 只清理定时器和等待短暂时间
    globalTimerManager.clearAllTimers();
    
    if (jest && jest.clearAllTimers) {
      jest.clearAllTimers();
    }

    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * 清理进程事件监听器
   * 只移除测试相关的监听器，保留核心功能
   */
  private static cleanupEventListeners(): void {
    try {
      // 简化实现：只记录监听器数量，不主动清理
      // 避免类型错误和意外的系统稳定性问题
      const eventNames = process.eventNames();
      if (eventNames.length > 20) {
        console.warn(`High number of event listeners detected: ${eventNames.length}`);
      }
    } catch (error) {
      console.warn('Error checking event listeners:', error);
    }
  }

  /**
   * 获取当前资源状态
   */
  static getResourceStatus(): {
    activeTimers: number;
    timerNames: string[];
    eventListenerCount: number;
    processListeners: Record<string, number>;
  } {
    const eventNames = process.eventNames();
    const processListeners: Record<string, number> = {};
    
    eventNames.forEach(eventName => {
      processListeners[String(eventName)] = process.listenerCount(eventName);
    });

    return {
      activeTimers: globalTimerManager.getActiveTimerCount(),
      timerNames: globalTimerManager.getTimerNames(),
      eventListenerCount: eventNames.length,
      processListeners
    };
  }

  /**
   * 检查是否有资源泄漏
   */
  static checkForLeaks(): {
    hasLeaks: boolean;
    details: {
      timers: number;
      suspiciousListeners: string[];
    };
  } {
    const status = this.getResourceStatus();
    const suspiciousListeners: string[] = [];

    // 检查可疑的事件监听器
    Object.entries(status.processListeners).forEach(([event, count]) => {
      // 如果某个事件有过多监听器，可能是泄漏
      if (count > 5) {
        suspiciousListeners.push(`${event}(${count})`);
      }
    });

    return {
      hasLeaks: status.activeTimers > 0 || suspiciousListeners.length > 0,
      details: {
        timers: status.activeTimers,
        suspiciousListeners
      }
    };
  }

  /**
   * 清空注册的清理回调
   */
  static clearCleanupCallbacks(): void {
    this.cleanupCallbacks = [];
  }

  /**
   * 等待所有异步操作完成
   * @param timeout 超时时间（毫秒）
   */
  static async waitForAsyncCompletion(timeout: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      const start = Date.now();
      
      const check = () => {
        const elapsed = Date.now() - start;
        
        if (elapsed >= timeout) {
          resolve();
          return;
        }

        // 检查是否还有活跃的定时器
        if (globalTimerManager.getActiveTimerCount() === 0) {
          resolve();
          return;
        }

        // 继续等待
        setTimeout(check, 10);
      };

      check();
    });
  }
}

/**
 * Jest测试环境的全局清理设置
 */
export const setupTestCleanup = () => {
  // 在每个测试后进行清理
  afterEach(async () => {
    await TestResourceManager.cleanupTestResources();
  });

  // 在每个测试套件后进行清理
  afterAll(async () => {
    await TestResourceManager.cleanupTestResources();
    TestResourceManager.clearCleanupCallbacks();
  });

  // 在测试开始前也进行一次清理，确保干净的环境
  beforeEach(async () => {
    await TestResourceManager.quickCleanup();
  });
};

/**
 * 测试资源状态检查装饰器
 * 用于在测试前后检查资源状态
 */
export const withResourceCheck = (testFn: () => Promise<void> | void) => {
  return async () => {
    const beforeStatus = TestResourceManager.getResourceStatus();
    
    try {
      await testFn();
    } finally {
      await TestResourceManager.cleanupTestResources();
      
      const afterStatus = TestResourceManager.getResourceStatus();
      const leakCheck = TestResourceManager.checkForLeaks();
      
      if (leakCheck.hasLeaks) {
        console.warn('Potential resource leak detected:', {
          before: beforeStatus,
          after: afterStatus,
          leaks: leakCheck.details
        });
      }
    }
  };
}; 