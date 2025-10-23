/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2025-04-01 11:11:35
 * @LastEditTime: 2025-04-01 11:12:05
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
/**
 * @Description: Test cases for index module
 * @Author: richen
 * @Date: 2025-04-01 11:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import * as index from '../src/index';
import * as trace from '../src/trace/trace';

describe('index.ts', () => {
  it('should re-export trace module', () => {
    expect(index.Trace).toBe(trace.Trace);
  });
});
