import { deepEqual, executeWithTimeout } from "../../src/utils/helper";

describe("Helper Utils", () => {
  describe("deepEqual", () => {
    it("should return true for identical primitive values", () => {
      expect(deepEqual(42, 42)).toBe(true);
      expect(deepEqual("hello", "hello")).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, undefined)).toBe(true);
    });

    it("should return true for the same object reference", () => {
      const obj = { a: 1, b: 2 };
      expect(deepEqual(obj, obj)).toBe(true);
    });

    it("should return false for different primitive values", () => {
      expect(deepEqual(42, 43)).toBe(false);
      expect(deepEqual("hello", "world")).toBe(false);
      expect(deepEqual(true, false)).toBe(false);
      expect(deepEqual(null, undefined)).toBe(false);
    });

    it("should return false for different types", () => {
      expect(deepEqual(42, "42")).toBe(false);
      expect(deepEqual(true, 1)).toBe(false);
      expect(deepEqual(null, 0)).toBe(false);
      expect(deepEqual(undefined, null)).toBe(false);
    });

    it("should handle null and undefined correctly", () => {
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, undefined)).toBe(true);
      expect(deepEqual(null, undefined)).toBe(false);
      expect(deepEqual(null, {})).toBe(false);
      expect(deepEqual(undefined, {})).toBe(false);
    });

    it("should compare simple objects correctly", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };
      const obj3 = { a: 1, b: 3 };
      const obj4 = { a: 1 };
      
      expect(deepEqual(obj1, obj2)).toBe(true);
      expect(deepEqual(obj1, obj3)).toBe(false);
      expect(deepEqual(obj1, obj4)).toBe(false);
    });

    it("should compare objects with different key counts", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2, c: 3 };
      
      expect(deepEqual(obj1, obj2)).toBe(false);
      expect(deepEqual(obj2, obj1)).toBe(false);
    });

    it("should handle nested objects", () => {
      const obj1 = { a: 1, b: { c: 2, d: 3 } };
      const obj2 = { a: 1, b: { c: 2, d: 3 } };
      const obj3 = { a: 1, b: { c: 2, d: 4 } };
      
      expect(deepEqual(obj1, obj2)).toBe(true);
      expect(deepEqual(obj1, obj3)).toBe(false);
    });

    it("should handle arrays", () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      const arr3 = [1, 2, 4];
      
      expect(deepEqual(arr1, arr2)).toBe(true);
      expect(deepEqual(arr1, arr3)).toBe(false);
    });

    it("should handle mixed nested structures", () => {
      const obj1 = { 
        a: 1, 
        b: [2, 3, { c: 4 }], 
        d: { e: [5, 6] } 
      };
      const obj2 = { 
        a: 1, 
        b: [2, 3, { c: 4 }], 
        d: { e: [5, 6] } 
      };
      const obj3 = { 
        a: 1, 
        b: [2, 3, { c: 5 }], 
        d: { e: [5, 6] } 
      };
      
      expect(deepEqual(obj1, obj2)).toBe(true);
      expect(deepEqual(obj1, obj3)).toBe(false);
    });

    it("should handle empty objects and arrays", () => {
      expect(deepEqual({}, {})).toBe(true);
      expect(deepEqual([], [])).toBe(true);
      expect(deepEqual({}, [])).toBe(false);
    });

    it("should handle objects with special values", () => {
      const obj1 = { a: null, b: undefined, c: 0, d: "" };
      const obj2 = { a: null, b: undefined, c: 0, d: "" };
      const obj3 = { a: null, b: null, c: 0, d: "" };
      
      expect(deepEqual(obj1, obj2)).toBe(true);
      expect(deepEqual(obj1, obj3)).toBe(false);
    });

    it("should handle circular references gracefully", () => {
      const obj1: any = { a: 1 };
      obj1.self = obj1;
      
      const obj2: any = { a: 1 };
      obj2.self = obj2;
      
      // Should not throw an error and should handle gracefully
      expect(() => deepEqual(obj1, obj2)).not.toThrow();
    });
  });

  describe("executeWithTimeout", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should resolve when operation completes within timeout", async () => {
      const operation = jest.fn().mockResolvedValue("success");
      
      const promise = executeWithTimeout(operation, 1000, "test operation");
      
      await expect(promise).resolves.toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should resolve synchronous operations", async () => {
      const operation = jest.fn().mockReturnValue("sync result");
      
      const promise = executeWithTimeout(operation, 1000, "sync operation");
      
      await expect(promise).resolves.toBe("sync result");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should reject when operation times out", async () => {
      const operation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );
      
      const promise = executeWithTimeout(operation, 1000, "slow operation");
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(1000);
      
      await expect(promise).rejects.toThrow("slow operation timed out after 1000ms");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should reject when operation throws an error", async () => {
      const error = new Error("operation failed");
      const operation = jest.fn().mockRejectedValue(error);
      
      const promise = executeWithTimeout(operation, 1000, "failing operation");
      
      await expect(promise).rejects.toThrow("operation failed");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should clear timeout when operation completes successfully", async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const operation = jest.fn().mockResolvedValue("success");
      
      await executeWithTimeout(operation, 1000, "test operation");
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it("should clear timeout when operation fails", async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const operation = jest.fn().mockRejectedValue(new Error("fail"));
      
      try {
        await executeWithTimeout(operation, 1000, "failing operation");
      } catch (e) {
        // Expected to fail
      }
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it("should handle different timeout values", async () => {
      const timeouts = [100, 500, 1000, 5000];
      
      for (const timeout of timeouts) {
        const operation = jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, timeout + 100))
        );
        
        const promise = executeWithTimeout(operation, timeout, "timeout test");
        
        jest.advanceTimersByTime(timeout);
        
        await expect(promise).rejects.toThrow(`timeout test timed out after ${timeout}ms`);
      }
    });

    it("should handle zero timeout", async () => {
      const operation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const promise = executeWithTimeout(operation, 0, "zero timeout");
      
      jest.advanceTimersByTime(0);
      
      await expect(promise).rejects.toThrow("zero timeout timed out after 0ms");
    });

    it("should handle operations that complete exactly at timeout", async () => {
      const operation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve("just in time"), 1000))
      );
      
      const promise = executeWithTimeout(operation, 1000, "edge case");
      
      // Operation completes at exactly 1000ms
      jest.advanceTimersByTime(999);
      // Should not timeout yet
      
      jest.advanceTimersByTime(1);
      // Now it should either resolve or timeout
      
      // This is a race condition, but typically the timeout will win
      await expect(promise).rejects.toThrow("edge case timed out after 1000ms");
    });

    it("should handle nested async operations", async () => {
      const nestedOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return "nested result";
      };
      
      const operation = jest.fn().mockImplementation(async () => {
        const result = await nestedOperation();
        return `wrapper: ${result}`;
      });
      
      const promise = executeWithTimeout(operation, 500, "nested operation");
      
      jest.advanceTimersByTime(100);
      
      await expect(promise).resolves.toBe("wrapper: nested result");
    });
  });

  describe("Integration Tests", () => {
    it("should use deepEqual in realistic scenarios", () => {
      const config1 = {
        server: {
          hostname: "localhost",
          port: 3000,
          ssl: {
            enabled: false,
            cert: null
          }
        },
        features: ["auth", "logging"]
      };
      
      const config2 = {
        server: {
          hostname: "localhost",
          port: 3000,
          ssl: {
            enabled: false,
            cert: null
          }
        },
        features: ["auth", "logging"]
      };
      
      const config3 = {
        server: {
          hostname: "localhost",
          port: 3000,
          ssl: {
            enabled: true,  // Different value
            cert: null
          }
        },
        features: ["auth", "logging"]
      };
      
      expect(deepEqual(config1, config2)).toBe(true);
      expect(deepEqual(config1, config3)).toBe(false);
    });

    it("should use executeWithTimeout for async config loading", async () => {
      jest.useFakeTimers();
      
      const loadConfig = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { loaded: true, timestamp: Date.now() };
      };
      
      const promise = executeWithTimeout(loadConfig, 1000, "config loading");
      
      jest.advanceTimersByTime(200);
      
      const result = await promise;
      expect(result).toEqual({ loaded: true, timestamp: expect.any(Number) });
      
      jest.useRealTimers();
    });
  });
}); 