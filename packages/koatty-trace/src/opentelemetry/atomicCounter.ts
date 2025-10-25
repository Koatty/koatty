/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2025-01-15 10:00:00
 */

/**
 * 原子计数器 - 确保线程安全的计数操作
 * 注意: JavaScript 是单线程的，原子性由事件循环保证
 * 用于 SpanManager 的并发安全统计
 */
export class AtomicCounter {
  private value = 0;
  
  /**
   * 递增计数器并返回新值
   */
  increment(): number {
    return ++this.value;
  }
  
  /**
   * 递减计数器并返回新值
   */
  decrement(): number {
    return --this.value;
  }
  
  /**
   * 获取当前值
   */
  get(): number {
    return this.value;
  }
  
  /**
   * 重置计数器为0
   */
  reset(): void {
    this.value = 0;
  }
  
  /**
   * 设置计数器为指定值
   */
  set(val: number): void {
    this.value = val;
  }
}
