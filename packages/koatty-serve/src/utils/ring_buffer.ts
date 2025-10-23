/* 
 * @Description: Ring buffer for efficient fixed-size circular data storage
 * @Usage: 用于高效的固定大小循环数据存储，避免频繁的数组操作
 * @Author: richen
 * @Date: 2025-10-12
 * @License: BSD (3-Clause)
 */

/**
 * Ring Buffer (Circular Buffer)
 * 环形缓冲区 - 固定大小的循环队列，覆盖最旧的数据
 * 
 * Features:
 * - O(1) write operations (no array shifts or slices)
 * - O(1) amortized read operations
 * - Fixed memory footprint
 * - Automatic overwrite of oldest data when full
 */
export class RingBuffer<T = number> {
  private buffer: T[];
  private head: number = 0;  // Write position
  private tail: number = 0;  // Read position (oldest item)
  private count: number = 0; // Number of items in buffer
  private readonly capacity: number;

  /**
   * Create a ring buffer with fixed capacity
   * @param capacity Maximum number of items to store
   */
  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Ring buffer capacity must be greater than 0');
    }
    
    this.capacity = capacity;
    this.buffer = new Array<T>(capacity);
  }

  /**
   * Add an item to the buffer
   * If buffer is full, overwrites the oldest item
   * @param item Item to add
   */
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    
    if (this.count < this.capacity) {
      this.count++;
    } else {
      // Buffer is full, move tail to overwrite oldest item
      this.tail = (this.tail + 1) % this.capacity;
    }
  }

  /**
   * Get all items in insertion order (oldest to newest)
   * @returns Array of items
   */
  toArray(): T[] {
    if (this.count === 0) {
      return [];
    }
    
    const result: T[] = new Array(this.count);
    let index = this.tail;
    
    for (let i = 0; i < this.count; i++) {
      result[i] = this.buffer[index];
      index = (index + 1) % this.capacity;
    }
    
    return result;
  }

  /**
   * Get a sorted copy of the buffer contents
   * @param compareFn Optional comparison function
   * @returns Sorted array
   */
  toSortedArray(compareFn?: (a: T, b: T) => number): T[] {
    return this.toArray().sort(compareFn);
  }

  /**
   * Clear all items from the buffer
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * Get the number of items currently in the buffer
   * @returns Current item count
   */
  get length(): number {
    return this.count;
  }

  /**
   * Get the maximum capacity of the buffer
   * @returns Buffer capacity
   */
  get size(): number {
    return this.capacity;
  }

  /**
   * Check if buffer is empty
   * @returns True if empty
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Check if buffer is full
   * @returns True if full
   */
  isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Get an item at a specific index (0 = oldest, length-1 = newest)
   * @param index Index to retrieve
   * @returns Item at index or undefined if out of range
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.count) {
      return undefined;
    }
    
    const actualIndex = (this.tail + index) % this.capacity;
    return this.buffer[actualIndex];
  }

  /**
   * Get the oldest item without removing it
   * @returns Oldest item or undefined if buffer is empty
   */
  peek(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    return this.buffer[this.tail];
  }

  /**
   * Get the newest item
   * @returns Newest item or undefined if buffer is empty
   */
  peekLast(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    const lastIndex = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[lastIndex];
  }

  /**
   * Calculate percentile from buffer contents (e.g., 0.5 for median, 0.95 for P95)
   * @param percentile Percentile value between 0 and 1
   * @returns Percentile value or undefined if buffer is empty
   */
  getPercentile(percentile: number): T | undefined {
    if (this.count === 0 || percentile < 0 || percentile > 1) {
      return undefined;
    }
    
    // For number types, we can calculate percentile directly
    const sorted = this.toSortedArray((a: any, b: any) => a - b);
    const index = Math.floor(sorted.length * percentile);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  /**
   * Get average of numeric buffer contents
   * @returns Average value or undefined if buffer is empty
   */
  getAverage(): number | undefined {
    if (this.count === 0) {
      return undefined;
    }
    
    let sum = 0;
    for (let i = 0; i < this.count; i++) {
      const value = this.get(i) as any;
      sum += Number(value) || 0;
    }
    
    return sum / this.count;
  }

  /**
   * Iterate over buffer contents (oldest to newest)
   * @param callback Function to call for each item
   */
  forEach(callback: (item: T, index: number) => void): void {
    for (let i = 0; i < this.count; i++) {
      const item = this.get(i);
      if (item !== undefined) {
        callback(item, i);
      }
    }
  }

  /**
   * Map buffer contents to a new array
   * @param callback Function to transform each item
   * @returns New array of transformed items
   */
  map<U>(callback: (item: T, index: number) => U): U[] {
    const result: U[] = new Array(this.count);
    for (let i = 0; i < this.count; i++) {
      const item = this.get(i);
      if (item !== undefined) {
        result[i] = callback(item, i);
      }
    }
    return result;
  }

  /**
   * Filter buffer contents
   * @param predicate Function to test each item
   * @returns New array of items that pass the test
   */
  filter(predicate: (item: T, index: number) => boolean): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const item = this.get(i);
      if (item !== undefined && predicate(item, i)) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Reduce buffer contents to a single value
   * @param callback Reducer function
   * @param initialValue Initial value for the accumulator
   * @returns Reduced value
   */
  reduce<U>(callback: (accumulator: U, item: T, index: number) => U, initialValue: U): U {
    let accumulator = initialValue;
    for (let i = 0; i < this.count; i++) {
      const item = this.get(i);
      if (item !== undefined) {
        accumulator = callback(accumulator, item, i);
      }
    }
    return accumulator;
  }
}

