import { App } from './app';

describe('app.config() - Set Configuration', () => {
  let app: App;

  beforeEach(() => {
    app = new App();
    // Initialize with some default config
    app.setMetaData('_configs', {
      config: {
        port: 3000,
        database: {
          host: 'localhost',
          port: 3306
        }
      },
      middleware: {
        list: ['trace', 'logger'],
        config: {
          trace: { enabled: true }
        }
      }
    });
  });

  describe('Get configuration (backward compatibility)', () => {
    test('should get single level config', () => {
      expect(app.config('port')).toBe(3000);
    });

    test('should get nested config', () => {
      expect(app.config('database.host')).toBe('localhost');
      expect(app.config('database.port')).toBe(3306);
    });

    test('should get all configs of specific type', () => {
      const middlewareConfig = app.config(undefined, 'middleware');
      expect(middlewareConfig).toHaveProperty('list');
      expect(middlewareConfig.list).toEqual(['trace', 'logger']);
    });

    test('should return null for non-existent config', () => {
      expect(app.config('nonexistent')).toBeUndefined();
    });
  });

  describe('Set single level configuration', () => {
    test('should set single level config', () => {
      const result = app.config('port', 'config', 8080);
      expect(result).toBe(8080);
      expect(app.config('port')).toBe(8080);
    });

    test('should set new single level config', () => {
      app.config('newKey', 'config', 'newValue');
      expect(app.config('newKey')).toBe('newValue');
    });

    test('should overwrite existing config', () => {
      expect(app.config('port')).toBe(3000);
      app.config('port', 'config', 5000);
      expect(app.config('port')).toBe(5000);
    });
  });

  describe('Set nested configuration', () => {
    test('should set nested config', () => {
      app.config('database.host', 'config', '127.0.0.1');
      expect(app.config('database.host')).toBe('127.0.0.1');
      // Other nested values should remain unchanged
      expect(app.config('database.port')).toBe(3306);
    });

    test('should create nested config if not exists', () => {
      app.config('redis.host', 'config', 'localhost');
      expect(app.config('redis.host')).toBe('localhost');
    });

    test('should set nested config for different type', () => {
      app.config('trace.timeout', 'middleware', 3000);
      expect(app.config('trace.timeout', 'middleware')).toBe(3000);
    });
  });

  describe('Set entire config type', () => {
    test('should set entire config type', () => {
      const newMiddlewareConfig = {
        list: ['newTrace', 'newLogger'],
        config: {
          newTrace: { enabled: false }
        }
      };
      app.config(undefined, 'middleware', newMiddlewareConfig);
      
      const result = app.config(undefined, 'middleware');
      expect(result).toEqual(newMiddlewareConfig);
    });

    test('should replace entire config type', () => {
      const oldConfig = app.config(undefined, 'config');
      expect(oldConfig.port).toBe(3000);
      
      app.config(undefined, 'config', { port: 4000, env: 'production' });
      
      const newConfig = app.config(undefined, 'config');
      expect(newConfig.port).toBe(4000);
      expect(newConfig.env).toBe('production');
      expect(newConfig.database).toBeUndefined(); // Old values should be gone
    });
  });

  describe('Set with different types', () => {
    test('should set string value', () => {
      app.config('env', 'config', 'production');
      expect(app.config('env')).toBe('production');
    });

    test('should set number value', () => {
      app.config('timeout', 'config', 5000);
      expect(app.config('timeout')).toBe(5000);
    });

    test('should set boolean value', () => {
      app.config('debug', 'config', true);
      expect(app.config('debug')).toBe(true);
    });

    test('should set object value', () => {
      const dbConfig = { host: 'localhost', port: 3306, user: 'root' };
      app.config('database', 'config', dbConfig);
      expect(app.config('database')).toEqual(dbConfig);
    });

    test('should set array value', () => {
      const middlewareList = ['trace', 'logger', 'router'];
      app.config('middlewareList', 'config', middlewareList);
      expect(app.config('middlewareList')).toEqual(middlewareList);
    });

    test('should set null value', () => {
      app.config('optional', 'config', null);
      expect(app.config('optional')).toBeNull();
    });
  });

  describe('Edge cases', () => {
    test('should handle undefined name for get', () => {
      const allConfig = app.config();
      expect(allConfig).toBeDefined();
      expect(allConfig.port).toBe(3000);
    });

    test('should not set when value is undefined', () => {
      const originalPort = app.config('port');
      app.config('port', 'config', undefined);
      expect(app.config('port')).toBe(originalPort); // Should remain unchanged
    });

    test('should handle non-string name (number)', () => {
      app.config(123 as any, 'config', 'numericKey');
      expect(app.config(123 as any)).toBe('numericKey');
    });

    test('should create nested structure on demand', () => {
      // Set nested value when parent doesn't exist
      app.config('newParent.child', 'config', 'childValue');
      expect(app.config('newParent.child')).toBe('childValue');
    });
  });

  describe('Multiple config types', () => {
    test('should handle different config types independently', () => {
      app.config('key1', 'config', 'value1');
      app.config('key1', 'middleware', 'value2');
      app.config('key1', 'custom', 'value3');
      
      expect(app.config('key1', 'config')).toBe('value1');
      expect(app.config('key1', 'middleware')).toBe('value2');
      expect(app.config('key1', 'custom')).toBe('value3');
    });

    test('should not affect other types when setting', () => {
      const middlewareBefore = app.config(undefined, 'middleware');
      app.config('port', 'config', 9000);
      const middlewareAfter = app.config(undefined, 'middleware');
      
      expect(middlewareAfter).toEqual(middlewareBefore);
    });
  });

  describe('Return value', () => {
    test('should return the set value', () => {
      const setValue = app.config('newKey', 'config', 'newValue');
      expect(setValue).toBe('newValue');
    });

    test('should return the set object', () => {
      const obj = { a: 1, b: 2 };
      const returnedValue = app.config('obj', 'config', obj);
      expect(returnedValue).toBe(obj);
    });

    test('should handle error gracefully', () => {
      // Test with invalid metadata structure
      const result = app.config('nonexistent.nested.deep');
      expect(result).toBeUndefined();
    });
  });

  describe('Practical use cases', () => {
    test('should enable/disable middleware dynamically', () => {
      app.config('trace.enabled', 'middleware', false);
      expect(app.config('trace.enabled', 'middleware')).toBe(false);
      
      app.config('trace.enabled', 'middleware', true);
      expect(app.config('trace.enabled', 'middleware')).toBe(true);
    });

    test('should update database connection at runtime', () => {
      app.config('database.host', 'config', '192.168.1.100');
      app.config('database.port', 'config', 5432);
      
      expect(app.config('database.host')).toBe('192.168.1.100');
      expect(app.config('database.port')).toBe(5432);
    });

    test('should modify middleware list', () => {
      const currentList = app.config('list', 'middleware');
      const newList = [...currentList, 'newMiddleware'];
      app.config('list', 'middleware', newList);
      
      expect(app.config('list', 'middleware')).toContain('newMiddleware');
    });

    test('should set environment-specific config', () => {
      app.config('env', 'config', 'production');
      app.config('debug', 'config', false);
      app.config('logsLevel', 'config', 'info');
      
      expect(app.config('env')).toBe('production');
      expect(app.config('debug')).toBe(false);
      expect(app.config('logsLevel')).toBe('info');
    });
  });
});

