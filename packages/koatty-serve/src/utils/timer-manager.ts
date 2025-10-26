/*
 * @Description: 统一定时器管理器
 * @Usage: 解决定时器资源泄漏问题，统一管理所有定时器
 * @Author: richen
 * @Date: 2024-11-27 20:30:00
 * @LastEditTime: 2024-11-27 20:30:00
 */

import { createLogger } from "./logger";

/**
 * 定时器信息接口
 */
export interface TimerInfo {
  id: string;
  name: string;
  interval: number;
  callback: () => void;
  timer: NodeJS.Timeout;
  createdAt: number;
  lastExecuted?: number;
  priority?: 'high' | 'medium' | 'low';
  protocol?: string;
}

/**
 * 定时器任务接口 - Phase 3 优化
 */
export interface TimerTask {
  id: string;
  name: string;
  callback: () => void;
  interval: number;
  priority: 'high' | 'medium' | 'low';
  protocol?: string;
  lastExecuted?: number;
  executionCount?: number;
}

/**
 * 定时器频率层次 - Phase 3 优化
 */
export enum TimerFrequency {
  HIGH = 5000,    // 5秒 - 关键健康检查
  MEDIUM = 30000, // 30秒 - 连接清理、ping检查
  LOW = 60000     // 60秒 - 深度健康检查、统计更新
}

/**
 * 定时器优化配置
 */
export interface TimerOptimizerConfig {
  enableConsolidation: boolean;     // 启用定时器合并
  enableAdaptiveFrequency: boolean; // 启用自适应频率调整
  maxTimersPerFrequency: number;    // 每个频率最大定时器数
  loadThreshold: number;            // 负载阈值 (0-1)
}

/**
 * 统一定时器管理器
 * 解决定时器资源泄漏和难以追踪的问题
 * Phase 3: 添加定时器优化功能
 */
export class TimerManager {
  private timers: Map<string, TimerInfo> = new Map();
  private timerIdCounter = 0;
  private readonly logger = createLogger({ module: 'timer_manager' });
  
  // Phase 3 优化功能
  private readonly optimizerConfig: TimerOptimizerConfig;
  private taskQueues: Map<TimerFrequency, TimerTask[]> = new Map();
  private consolidatedTimers: Map<TimerFrequency, string> = new Map();
  private performanceMetrics = {
    totalTasks: 0,
    executedTasks: 0,
    averageExecutionTime: 0,
    lastOptimization: Date.now()
  };

  constructor(config: Partial<TimerOptimizerConfig> = {}) {
    this.optimizerConfig = {
      enableConsolidation: true,  // 默认启用优化模式
      enableAdaptiveFrequency: true,
      maxTimersPerFrequency: 10,
      loadThreshold: 0.7,
      ...config
    };

    // 初始化任务队列
    Object.values(TimerFrequency).forEach(frequency => {
      if (typeof frequency === 'number') {
        this.taskQueues.set(frequency, []);
      }
    });

    this.logger.debug('Timer manager initialized with optimization', {}, {
      config: this.optimizerConfig,
      supportedFrequencies: Object.values(TimerFrequency).filter(f => typeof f === 'number')
    });
  }
  
  /**
   * 添加定时器 (传统方式)
   * @param name 定时器名称
   * @param callback 回调函数
   * @param interval 间隔时间(毫秒)
   * @returns 定时器ID
   */
  /**
   * 添加定时器 - 统一使用优化模式
   * @param name 定时器名称
   * @param callback 回调函数
   * @param interval 间隔时间(毫秒)
   * @returns 定时器ID
   */
  addTimer(name: string, callback: () => void, interval: number): string {
    return this.addOptimizedTimer({
      name,
      callback,
      interval,
      priority: this.determinePriority(interval),
      protocol: this.extractProtocol(name)
    });
  }

  /**
   * 添加优化定时器 - Phase 3
   * @param task 定时器任务
   * @returns 任务ID
   */
  addOptimizedTimer(task: Omit<TimerTask, 'id' | 'lastExecuted' | 'executionCount'>): string {
    const taskId = `${task.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimizedTask: TimerTask = {
      ...task,
      id: taskId,
      lastExecuted: 0,
      executionCount: 0
    };

    // 根据间隔选择最佳频率
    const frequency = this.selectOptimalFrequency(task.interval);
    const taskQueue = this.taskQueues.get(frequency);

    if (taskQueue) {
      taskQueue.push(optimizedTask);
      this.performanceMetrics.totalTasks++;

      // this.logger.debug('Optimized task added', {}, {
      //   taskId,
      //   name: task.name,
      //   originalInterval: task.interval,
      //   optimizedFrequency: frequency,
      //   queueSize: taskQueue.length
      // });

      // 重新优化定时器
      this.optimizeTimers();
    }

    return taskId;
  }

  /**
   * 创建物理定时器 - 用于合并定时器的底层实现
   */
  private createPhysicalTimer(name: string, callback: () => void, interval: number): string {
    const timerId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const wrappedCallback = () => {
      try {
        callback();
      } catch (error) {
        this.logger.error('Timer callback error', { 
          name, 
          timerId, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    };

    const timer = setInterval(wrappedCallback, interval);
    // 使用 unref() 确保定时器不会阻止进程退出
    // 在测试环境中，fake timers 可能没有 unref 方法，需要安全检查
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    
    const timerInfo: TimerInfo = {
      id: timerId,
      name,
      interval,
      callback: wrappedCallback,
      timer,
      createdAt: Date.now(),
      lastExecuted: Date.now()
    };

    this.timers.set(timerId, timerInfo);
    
    // this.logger.debug('Physical timer created', { 
    //   interval, 
    //   name, 
    //   totalTimers: this.timers.size 
    // });
    
    return timerId;
  }

  /**
   * 清理指定定时器 - 支持逻辑定时器清理
   * @param timerIdOrName 定时器ID或名称
   * @returns 是否成功清理
   */
  clearTimer(timerIdOrName: string): boolean {
    // 首先尝试从任务队列中移除（通过ID或名称）
    for (const [_frequency, tasks] of this.taskQueues) {
      const taskIndex = tasks.findIndex(task => 
        task.id === timerIdOrName || task.name === timerIdOrName
      );
      if (taskIndex !== -1) {
        // const task = tasks[taskIndex];
        // tasks.splice(taskIndex, 1);
        this.performanceMetrics.totalTasks--;
        
        // this.logger.debug(`Logical timer '${timerIdOrName}' cleared`, {}, {
        //   name: task.name,
        //   id: task.id,
        //   _frequency,
        //   remainingTasks: tasks.length
        // });
        
        // 重新优化定时器
        this.optimizeTimers();
        return true;
      }
    }
    
    // 如果不是逻辑定时器，尝试清理物理定时器
    const timerInfo = this.timers.get(timerIdOrName);
    if (timerInfo) {
      clearInterval(timerInfo.timer);
      this.timers.delete(timerIdOrName);
      
      // this.logger.debug(`Physical timer '${timerIdOrName}' cleared`, {}, {
      //   name: timerInfo.name,
      //   uptime: Date.now() - timerInfo.createdAt,
      //   remainingTimers: this.timers.size
      // });
      
      return true;
    }
    
    this.logger.warn(`Timer '${timerIdOrName}' not found for clearing`);
    return false;
  }

  /**
   * 清理所有定时器 - 支持逻辑和物理定时器清理
   */
  clearAllTimers(): void {
    const logicalTimerCount = this.performanceMetrics.totalTasks;
    const physicalTimerCount = this.timers.size;
    
    this.logger.debug(`Clearing all timers`, {}, { 
      logicalTimers: logicalTimerCount,
      physicalTimers: physicalTimerCount 
    });

    // 清理逻辑定时器（任务队列）
    this.taskQueues.clear();
    this.performanceMetrics.totalTasks = 0;
    this.performanceMetrics.executedTasks = 0;

    // 重新初始化任务队列
    Object.values(TimerFrequency).forEach(frequency => {
      if (typeof frequency === 'number') {
        this.taskQueues.set(frequency, []);
      }
    });

    // 清理物理定时器
    for (const [timerId, timerInfo] of this.timers) {
      try {
        clearInterval(timerInfo.timer);
        // this.logger.debug(`Physical timer '${timerId}' cleared in batch`, {}, {
        //   name: timerInfo.name,
        //   uptime: Date.now() - timerInfo.createdAt
        // });
      } catch (error) {
        this.logger.error(`Error clearing timer '${timerId}':`, {}, error);
      }
    }

    this.timers.clear();
    this.consolidatedTimers.clear();
    
    this.logger.debug(`All timers cleared successfully`, {}, {
      clearedLogicalTimers: logicalTimerCount,
      clearedPhysicalTimers: physicalTimerCount
    });
  }

  /**
   * 获取活跃定时器数量 - 返回逻辑定时器数量
   */
  getActiveTimerCount(): number {
    // 在优化模式下，返回任务数量而不是物理定时器数量
    return this.performanceMetrics.totalTasks;
  }

  /**
   * 获取所有定时器名称 - 返回逻辑定时器名称
   */
  getTimerNames(): string[] {
    const names: string[] = [];
    for (const tasks of this.taskQueues.values()) {
      names.push(...tasks.map(task => task.name));
    }
    return names;
  }

  /**
   * 获取定时器详细信息
   */
  getTimerInfo(timerId: string): TimerInfo | undefined {
    return this.timers.get(timerId);
  }

  /**
   * 获取所有定时器统计信息 - 返回逻辑定时器统计
   */
  getTimerStats(): {
    totalTimers: number;
    timers: Array<{
      id: string;
      name: string;
      interval: number;
      uptime: number;
      lastExecuted?: number;
      priority: string;
      executionCount: number;
    }>;
  } {
    const now = Date.now();
    const timers: Array<{
      id: string;
      name: string;
      interval: number;
      uptime: number;
      lastExecuted?: number;
      priority: string;
      executionCount: number;
    }> = [];
    
    // 收集所有逻辑定时器信息
    for (const tasks of this.taskQueues.values()) {
      for (const task of tasks) {
        timers.push({
          id: task.id,
          name: task.name,
          interval: task.interval,
          uptime: now - (task.lastExecuted || now),
          lastExecuted: task.lastExecuted,
          priority: task.priority,
          executionCount: task.executionCount || 0
        });
      }
    }
    
    return {
      totalTimers: this.performanceMetrics.totalTasks,
      timers
    };
  }

  /**
   * 检查是否存在指定定时器 - 支持逻辑和物理定时器
   */
  hasTimer(timerId: string): boolean {
    // 首先检查逻辑定时器
    for (const tasks of this.taskQueues.values()) {
      if (tasks.some(task => task.id === timerId)) {
        return true;
      }
    }
    
    // 然后检查物理定时器
    return this.timers.has(timerId);
  }

  /**
   * 确定定时器优先级 - Phase 3 优化
   */
  private determinePriority(interval: number): 'high' | 'medium' | 'low' {
    if (interval <= 5000) return 'high';
    if (interval <= 30000) return 'medium';
    return 'low';
  }

  /**
   * 从定时器名称提取协议 - Phase 3 优化
   */
  private extractProtocol(name: string): string | undefined {
    const protocolMatch = name.match(/^(http|https|http2|grpc|websocket|ws)/i);
    return protocolMatch ? protocolMatch[1].toLowerCase() : undefined;
  }

  /**
   * 选择最佳频率 - Phase 3 优化
   */
  private selectOptimalFrequency(interval: number): TimerFrequency {
    const frequencies = [TimerFrequency.HIGH, TimerFrequency.MEDIUM, TimerFrequency.LOW];
    
    // 选择最接近且不小于原间隔的频率
    for (const freq of frequencies) {
      if (interval <= freq) {
        return freq;
      }
    }

    // 如果间隔太大，使用最低频率
    return TimerFrequency.LOW;
  }

  /**
   * 优化定时器 - Phase 3 核心优化逻辑
   */
  private optimizeTimers(): void {
    // const startTime = Date.now();

    // 清理现有的合并定时器
    this.clearConsolidatedTimers();

    // 为每个频率创建合并定时器
    for (const [frequency, tasks] of this.taskQueues) {
      if (tasks.length > 0) {
        this.createConsolidatedTimer(frequency, tasks);
      }
    }

    // const optimizationTime = Date.now() - startTime;
    this.performanceMetrics.lastOptimization = Date.now();

    // this.logger.debug('Timer optimization completed', {}, {
    //   optimizationTime,
    //   totalTasks: this.performanceMetrics.totalTasks,
    //   activeFrequencies: this.consolidatedTimers.size,
    //   consolidatedTimers: Array.from(this.consolidatedTimers.keys())
    // });
  }

  /**
   * 创建合并定时器 - Phase 3 优化
   */
  private createConsolidatedTimer(frequency: TimerFrequency, tasks: TimerTask[]): void {
    const timerName = `consolidated_${frequency}ms`;
    
    const timerId = this.createPhysicalTimer(timerName, () => {
      this.executeTaskBatch(frequency, tasks);
    }, frequency);

    this.consolidatedTimers.set(frequency, timerId);

    // this.logger.debug('Consolidated timer created', {}, {
    //   frequency,
    //   taskCount: tasks.length,
    //   timerId,
    //   tasks: tasks.map(t => ({ name: t.name, priority: t.priority }))
    // });
  }

  /**
   * 执行任务批次 - Phase 3 优化
   */
  private executeTaskBatch(frequency: TimerFrequency, tasks: TimerTask[]): void {
    // const batchStartTime = Date.now();
    let executedCount = 0;

    // 按优先级排序执行
    const sortedTasks = tasks.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const task of sortedTasks) {
      try {
        const taskStartTime = Date.now();
        
        // 检查是否需要执行（基于自适应频率）
        if (this.shouldExecuteTask(task, frequency)) {
          task.callback();
          task.lastExecuted = Date.now();
          task.executionCount = (task.executionCount || 0) + 1;
          executedCount++;

          const taskExecutionTime = Date.now() - taskStartTime;
          
          // 更新平均执行时间
          this.updateAverageExecutionTime(taskExecutionTime);
        }
      } catch (error) {
        this.logger.error('Task execution error', {}, {
          taskId: task.id,
          taskName: task.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // const batchExecutionTime = Date.now() - batchStartTime;
    this.performanceMetrics.executedTasks += executedCount;

    // 记录批次执行统计（仅在有执行任务时）
    // if (executedCount > 0) {
    //   this.logger.debug('Task batch executed', {}, {
    //     frequency,
    //     totalTasks: tasks.length,
    //     executedTasks: executedCount,
    //     batchExecutionTime,
    //     averageTaskTime: executedCount > 0 ? batchExecutionTime / executedCount : 0
    //   });
    // }
  }

  /**
   * 判断是否应该执行任务（自适应频率）- Phase 3 优化
   */
  private shouldExecuteTask(task: TimerTask, frequency: TimerFrequency): boolean {
    if (!this.optimizerConfig.enableAdaptiveFrequency) {
      return true;
    }

    // 高优先级任务总是执行
    if (task.priority === 'high') {
      return true;
    }

    // 基于原始间隔和当前频率计算执行概率
    const intervalRatio = task.interval / frequency;
    
    // 如果原始间隔小于等于当前频率，总是执行
    if (intervalRatio <= 1) {
      return true;
    }

    // 基于间隔比例和上次执行时间决定是否执行
    const timeSinceLastExecution = Date.now() - (task.lastExecuted || 0);
    return timeSinceLastExecution >= task.interval;
  }

  /**
   * 更新平均执行时间 - Phase 3 优化
   */
  private updateAverageExecutionTime(executionTime: number): void {
    const alpha = 0.1; // 指数移动平均的平滑因子
    this.performanceMetrics.averageExecutionTime = 
      this.performanceMetrics.averageExecutionTime * (1 - alpha) + executionTime * alpha;
  }

  /**
   * 清理合并定时器 - Phase 3 优化
   */
  private clearConsolidatedTimers(): void {
    for (const timerId of this.consolidatedTimers.values()) {
      this.clearTimer(timerId);
    }
    this.consolidatedTimers.clear();
  }

  /**
   * 获取优化统计信息 - Phase 3 优化
   */
  getOptimizationStats() {
    const tasksByFrequency = new Map<TimerFrequency, number>();
    const tasksByPriority = { high: 0, medium: 0, low: 0 };

    for (const [frequency, tasks] of this.taskQueues) {
      tasksByFrequency.set(frequency, tasks.length);
      
      for (const task of tasks) {
        tasksByPriority[task.priority]++;
      }
    }

    return {
      performance: this.performanceMetrics,
      consolidation: {
        activeTimers: this.consolidatedTimers.size,
        totalTasks: this.performanceMetrics.totalTasks,
        tasksByFrequency: Object.fromEntries(tasksByFrequency),
        tasksByPriority
      },
      config: this.optimizerConfig
    };
  }

  /**
   * 演示Phase 3优化功能 - 创建优化版本的TimerManager实例
   */
  static createOptimizedInstance(): TimerManager {
    return new TimerManager({
      enableConsolidation: true,
      enableAdaptiveFrequency: true,
      maxTimersPerFrequency: 10,
      loadThreshold: 0.7
    });
  }

  /**
   * 演示定时器优化效果
   */
  demonstrateOptimization(): {
    before: { timerCount: number; intervals: number[] };
    after: { consolidatedTimers: number; frequencies: number[]; estimatedReduction: string };
  } {
    // 模拟传统方式的定时器使用
    const traditionalIntervals = [5000, 5000, 30000, 30000, 30000, 60000, 60000];
    
    // 优化后的频率
    const optimizedFrequencies = [TimerFrequency.HIGH, TimerFrequency.MEDIUM, TimerFrequency.LOW];
    
    const reduction = ((traditionalIntervals.length - optimizedFrequencies.length) / traditionalIntervals.length * 100).toFixed(1);
    
    return {
      before: {
        timerCount: traditionalIntervals.length,
        intervals: traditionalIntervals
      },
      after: {
        consolidatedTimers: optimizedFrequencies.length,
        frequencies: optimizedFrequencies,
        estimatedReduction: `${reduction}% timer reduction`
      }
    };
  }

  /**
   * 安全销毁管理器
   */
  destroy(): void {
    this.logger.debug('TimerManager destroying', {}, {
      activeTimers: this.timers.size,
      totalTasks: this.performanceMetrics.totalTasks,
      executedTasks: this.performanceMetrics.executedTasks,
      activeConsolidatedTimers: this.consolidatedTimers.size
    });

    this.clearConsolidatedTimers();
    this.taskQueues.clear();
    this.clearAllTimers();
    
    this.logger.debug('TimerManager destroyed successfully');
  }
}

/**
 * 全局定时器管理器实例
 * 可用于跨模块的定时器管理
 * 默认启用优化功能
 */
export const globalTimerManager = new TimerManager({
  enableConsolidation: true,  // 默认启用优化模式
  enableAdaptiveFrequency: true,
  maxTimersPerFrequency: 10,
  loadThreshold: 0.7
}); 