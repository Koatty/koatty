/*
 * @Description: Performance benchmark utilities
 * @Author: richen
 * @Date: 2025-01-20 10:00:00
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { LRUCache } from "lru-cache";

// Simple cache performance test
export function benchmarkCache() {
  const cache = new LRUCache<string, any>({ max: 1000 });
  
  console.time('Cache Performance');
  
  // Set operations
  for (let i = 0; i < 10000; i++) {
    cache.set(`key${i}`, { value: i });
  }
  
  // Get operations
  for (let i = 0; i < 10000; i++) {
    cache.get(`key${i % 1000}`);
  }
  
  console.timeEnd('Cache Performance');
  console.log(`Final cache size: ${cache.size}`);
}

// Memory stress test
export function memoryStressTest() {
  const cache = new LRUCache<string, any>({ max: 10000 });
  
      const initialMemory = process.memoryUsage();
      
  // Create a lot of objects
  for (let i = 0; i < 100000; i++) {
    cache.set(`stress-${i}`, {
      id: i,
      data: new Array(100).fill(i),
          timestamp: Date.now()
        });
      }
      
      const peakMemory = process.memoryUsage();
      
      cache.clear();
      
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
  console.log('Memory Stress Test:');
      console.log(`Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Peak: ${(peakMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
}

export function testPayloadCachePerformance() {
  const { clearTypeMapCache, getTypeMapCacheStats } = require('../src/payload/payload_cache');
  
  clearTypeMapCache();
  
  console.log('Payload cache performance test completed');
}

export function testLargePayloadCaching() {
  const { clearTypeMapCache, getTypeMapCacheStats } = require('../src/payload/payload_cache');
  
  clearTypeMapCache();
  
  console.log('Large payload caching test completed');
} 