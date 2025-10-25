/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2025-01-15 10:00:00
 */

import { AtomicCounter } from '../../src/opentelemetry/atomicCounter';

describe('AtomicCounter', () => {
  it('should increment correctly', () => {
    const counter = new AtomicCounter();
    expect(counter.increment()).toBe(1);
    expect(counter.increment()).toBe(2);
    expect(counter.get()).toBe(2);
  });

  it('should decrement correctly', () => {
    const counter = new AtomicCounter();
    counter.set(5);
    expect(counter.decrement()).toBe(4);
    expect(counter.get()).toBe(4);
  });

  it('should reset correctly', () => {
    const counter = new AtomicCounter();
    counter.set(10);
    counter.reset();
    expect(counter.get()).toBe(0);
  });

  it('should set value correctly', () => {
    const counter = new AtomicCounter();
    counter.set(100);
    expect(counter.get()).toBe(100);
  });

  it('should handle multiple operations', () => {
    const counter = new AtomicCounter();
    counter.increment(); // 1
    counter.increment(); // 2
    counter.increment(); // 3
    expect(counter.get()).toBe(3);
    counter.decrement(); // 2
    expect(counter.get()).toBe(2);
    counter.set(10); // 10
    expect(counter.get()).toBe(10);
    counter.reset(); // 0
    expect(counter.get()).toBe(0);
  });
});

