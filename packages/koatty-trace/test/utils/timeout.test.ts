/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2025-01-15 10:00:00
 */

import { TimeoutController } from '../../src/utils/timeout';

describe('TimeoutController', () => {
  it('should create timeout promise', async () => {
    const ctrl = new TimeoutController();
    const timeoutPromise = ctrl.createTimeout(100);
    
    await expect(timeoutPromise).rejects.toThrow('Deadline exceeded');
  });

  it('should clear timer successfully', async () => {
    const ctrl = new TimeoutController();
    const promise = Promise.resolve('success');
    
    const race = Promise.race([
      promise,
      ctrl.createTimeout(1000)
    ]);
    
    const result = await race;
    ctrl.clear();
    
    expect(result).toBe('success');
    expect(ctrl.cleared).toBe(true);
  });

  it('should not create timeout after cleared', async () => {
    const ctrl = new TimeoutController();
    ctrl.clear();
    
    await expect(
      ctrl.createTimeout(100)
    ).rejects.toThrow('TimeoutController already cleared');
  });

  it('should support AbortSignal', async () => {
    const ctrl = new TimeoutController();
    const abortController = new AbortController();
    
    const timeoutPromise = ctrl.createTimeout(1000, abortController.signal);
    
    setTimeout(() => abortController.abort(), 50);
    
    await expect(timeoutPromise).rejects.toThrow('Request aborted');
    expect(ctrl.cleared).toBe(true);
  });
});

