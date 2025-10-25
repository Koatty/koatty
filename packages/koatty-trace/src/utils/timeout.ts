/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2025-01-15 10:00:00
 */

/**
 * 超时控制器 - 管理请求超时的定时器生命周期
 * 用于确保定时器能够被正确清除，避免内存泄漏
 */
export class TimeoutController {
  private timerId: NodeJS.Timeout | null = null;
  private isCleared = false;

  /**
   * 创建超时 Promise
   * @param ms 超时时间（毫秒）
   * @param signal 可选的 AbortSignal 用于外部取消
   * @returns 永远拒绝的 Promise，超时时抛出错误
   */
  createTimeout(ms: number, signal?: AbortSignal): Promise<never> {
    if (this.isCleared) {
      return Promise.reject(new Error('TimeoutController already cleared'));
    }

    return new Promise((_, reject) => {
      this.timerId = setTimeout(() => {
        if (!this.isCleared) {
          reject(new Error('Deadline exceeded'));
        }
      }, ms);
      
      // 支持 AbortSignal 取消
      signal?.addEventListener('abort', () => {
        this.clear();
        reject(new Error('Request aborted'));
      }, { once: true });
    });
  }

  /**
   * 清除定时器
   */
  clear(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.isCleared = true;
  }

  /**
   * 检查是否已清除
   */
  get cleared(): boolean {
    return this.isCleared;
  }
}

