import { KoattyMetadata } from '../src/Metadata';

describe('KoattyMetadata', () => {
  let metadata: KoattyMetadata;

  beforeEach(() => {
    metadata = new KoattyMetadata();
  });

  describe('set', () => {
    it('should store non-array value as array', () => {
      metadata.set('key1', 'value1');
      expect(metadata.get('key1')).toEqual(['value1']);
    });

    it('should store array value directly', () => {
      metadata.set('key2', ['value2', 'value3']);
      expect(metadata.get('key2')).toEqual(['value2', 'value3']);
    });

    it('should invalidate cache when setting new value', () => {
      metadata.set('key1', 'value1');
      const map1 = metadata.getMap();
      metadata.set('key2', 'value2');
      const map2 = metadata.getMap();
      expect(map1).not.toBe(map2); // Different object references
    });

    it('should overwrite existing values', () => {
      metadata.set('key1', 'value1');
      metadata.set('key1', 'newValue');
      expect(metadata.get('key1')).toEqual(['newValue']);
    });
  });

  describe('add', () => {
    it('should append non-array value to existing array', () => {
      metadata.set('key1', 'value1');
      metadata.add('key1', 'value2');
      expect(metadata.get('key1')).toEqual(['value1', 'value2']);
    });

    it('should merge array value with existing array', () => {
      metadata.set('key1', ['value1']);
      metadata.add('key1', ['value2', 'value3']);
      expect(metadata.get('key1')).toEqual(['value1', 'value2', 'value3']);
    });

    it('should create new array when key not exists', () => {
      metadata.add('newKey', 'value1');
      expect(metadata.get('newKey')).toEqual(['value1']);
    });

    it('should create new array when key not exists with array value', () => {
      metadata.add('newKey', ['value1', 'value2']);
      expect(metadata.get('newKey')).toEqual(['value1', 'value2']);
    });

    it('should invalidate cache when adding value', () => {
      metadata.set('key1', 'value1');
      const map1 = metadata.getMap();
      metadata.add('key1', 'value2');
      const map2 = metadata.getMap();
      expect(map1).not.toBe(map2);
    });
  });

  describe('get', () => {
    it('should return empty array for non-existent key', () => {
      expect(metadata.get('nonexistent')).toEqual([]);
    });

    it('should return values for existing key', () => {
      metadata.set('key1', ['value1', 'value2']);
      expect(metadata.get('key1')).toEqual(['value1', 'value2']);
    });
  });

  describe('getFirst', () => {
    it('should return first value when values exist', () => {
      metadata.set('key1', ['first', 'second', 'third']);
      expect(metadata.getFirst('key1')).toBe('first');
    });

    it('should return undefined for non-existent key', () => {
      expect(metadata.getFirst('nonexistent')).toBeUndefined();
    });

    it('should return undefined for empty array', () => {
      metadata.set('key1', []);
      expect(metadata.getFirst('key1')).toBeUndefined();
    });

    it('should return single value', () => {
      metadata.set('key1', 'singleValue');
      expect(metadata.getFirst('key1')).toBe('singleValue');
    });
  });

  describe('remove', () => {
    it('should remove existing key', () => {
      metadata.set('key1', 'value1');
      metadata.remove('key1');
      expect(metadata.get('key1')).toEqual([]);
    });

    it('should handle removal of non-existent key', () => {
      metadata.remove('nonexistent');
      expect(metadata.get('nonexistent')).toEqual([]);
    });

    it('should invalidate cache when removing key', () => {
      metadata.set('key1', 'value1');
      const map1 = metadata.getMap();
      metadata.remove('key1');
      const map2 = metadata.getMap();
      expect(map1).not.toBe(map2);
    });
  });

  describe('getMap', () => {
    it('should return empty object for empty metadata', () => {
      expect(metadata.getMap()).toEqual({});
    });

    it('should return first value of each key', () => {
      metadata.set('key1', ['first', 'second']);
      metadata.set('key2', 'single');
      const map = metadata.getMap();
      expect(map).toEqual({
        key1: 'first',
        key2: 'single'
      });
    });

    it('should handle Buffer values correctly', () => {
      const buffer = Buffer.from('test data');
      metadata.set('buffer', buffer);
      const map = metadata.getMap();
      expect(map.buffer).toBeInstanceOf(Buffer);
      expect(map.buffer).not.toBe(buffer); // Should be a copy
      expect(map.buffer.toString()).toBe('test data');
    });

    it('should use cached result on subsequent calls', () => {
      metadata.set('key1', 'value1');
      const map1 = metadata.getMap();
      const map2 = metadata.getMap();
      expect(map1).toBe(map2); // Same object reference
    });

    it('should skip keys with empty arrays', () => {
      metadata.set('key1', 'value1');
      metadata.set('key2', []);
      const map = metadata.getMap();
      expect(map).toEqual({ key1: 'value1' });
    });
  });

  describe('clone', () => {
    it('should create a deep copy', () => {
      metadata.set('key1', ['value1', 'value2']);
      metadata.set('key2', 'value3');
      const cloned = metadata.clone();
      
      expect(cloned.get('key1')).toEqual(['value1', 'value2']);
      expect(cloned.get('key2')).toEqual(['value3']);
      
      // Modify original
      metadata.set('key1', 'modified');
      expect(cloned.get('key1')).toEqual(['value1', 'value2']); // Unchanged
    });

    it('should clone Buffer values correctly', () => {
      const buffer = Buffer.from('test data');
      metadata.set('buffer', [buffer, 'string']);
      const cloned = metadata.clone();
      
      const clonedValues = cloned.get('buffer');
      expect(clonedValues[0]).toBeInstanceOf(Buffer);
      expect(clonedValues[0]).not.toBe(buffer); // Different Buffer instance
      expect(clonedValues[0].toString()).toBe('test data');
      expect(clonedValues[1]).toBe('string');
    });

    it('should create independent metadata instances', () => {
      metadata.set('key1', 'value1');
      const cloned = metadata.clone();
      
      cloned.set('key2', 'value2');
      expect(metadata.get('key2')).toEqual([]); // Original unchanged
      expect(cloned.get('key2')).toEqual(['value2']);
    });
  });

  describe('merge', () => {
    it('should merge another metadata instance', () => {
      metadata.set('key1', 'value1');
      metadata.set('key2', ['value2a']);
      
      const other = new KoattyMetadata();
      other.set('key2', ['value2b']);
      other.set('key3', 'value3');
      
      metadata.merge(other);
      
      expect(metadata.get('key1')).toEqual(['value1']);
      expect(metadata.get('key2')).toEqual(['value2a', 'value2b']);
      expect(metadata.get('key3')).toEqual(['value3']);
    });

    it('should merge values for existing keys', () => {
      metadata.set('shared', ['original1', 'original2']);
      
      const other = new KoattyMetadata();
      other.set('shared', ['merged1', 'merged2']);
      
      metadata.merge(other);
      expect(metadata.get('shared')).toEqual(['original1', 'original2', 'merged1', 'merged2']);
    });

    it('should add new keys from other metadata', () => {
      metadata.set('existing', 'value');
      
      const other = new KoattyMetadata();
      other.set('new', 'newValue');
      
      metadata.merge(other);
      expect(metadata.get('existing')).toEqual(['value']);
      expect(metadata.get('new')).toEqual(['newValue']);
    });

    it('should invalidate cache when merging', () => {
      metadata.set('key1', 'value1');
      const map1 = metadata.getMap();
      
      const other = new KoattyMetadata();
      other.set('key2', 'value2');
      
      metadata.merge(other);
      const map2 = metadata.getMap();
      expect(map1).not.toBe(map2);
    });
  });

  describe('from', () => {
    it('should create metadata from plain object', () => {
      const obj = {
        key1: 'value1',
        key2: ['value2a', 'value2b'],
        key3: 123
      };
      
      const metadata = KoattyMetadata.from(obj);
      expect(metadata.get('key1')).toEqual(['value1']);
      expect(metadata.get('key2')).toEqual(['value2a', 'value2b']); // Array values are set directly
      expect(metadata.get('key3')).toEqual([123]);
    });

    it('should handle empty object', () => {
      const metadata = KoattyMetadata.from({});
      expect(metadata.getMap()).toEqual({});
    });
  });

  describe('toJSON', () => {
    it('should return same as getMap', () => {
      metadata.set('key1', ['value1', 'value2']);
      metadata.set('key2', 'value3');
      
      const json = metadata.toJSON();
      const map = metadata.getMap();
      
      expect(json).toEqual(map);
    });

    it('should be serializable', () => {
      metadata.set('key1', 'value1');
      metadata.set('key2', 123);
      
      const jsonString = JSON.stringify(metadata);
      const parsed = JSON.parse(jsonString);
      
      expect(parsed).toEqual({
        key1: 'value1',
        key2: 123
      });
    });
  });

  describe('size', () => {
    it('should return 0 for empty metadata', () => {
      expect(metadata.size).toBe(0);
    });

    it('should return correct size', () => {
      metadata.set('key1', 'value1');
      expect(metadata.size).toBe(1);
      
      metadata.set('key2', 'value2');
      expect(metadata.size).toBe(2);
      
      metadata.remove('key1');
      expect(metadata.size).toBe(1);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty metadata', () => {
      expect(metadata.isEmpty()).toBe(true);
    });

    it('should return false for non-empty metadata', () => {
      metadata.set('key1', 'value1');
      expect(metadata.isEmpty()).toBe(false);
    });

    it('should return true after clearing all keys', () => {
      metadata.set('key1', 'value1');
      metadata.set('key2', 'value2');
      metadata.remove('key1');
      metadata.remove('key2');
      expect(metadata.isEmpty()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all metadata', () => {
      metadata.set('key1', 'value1');
      metadata.set('key2', ['value2a', 'value2b']);
      
      metadata.clear();
      
      expect(metadata.size).toBe(0);
      expect(metadata.isEmpty()).toBe(true);
      expect(metadata.get('key1')).toEqual([]);
      expect(metadata.get('key2')).toEqual([]);
    });

    it('should invalidate cache when clearing', () => {
      metadata.set('key1', 'value1');
      const map1 = metadata.getMap();
      
      metadata.clear();
      const map2 = metadata.getMap();
      
      expect(map1).not.toBe(map2);
      expect(map2).toEqual({});
    });
  });

  describe('integration', () => {
    it('should handle mixed array and non-array values', () => {
      metadata.set('mixed', 'value1');
      metadata.add('mixed', ['value2', 'value3']);
      metadata.add('mixed', 'value4');
      expect(metadata.get('mixed')).toEqual(['value1', 'value2', 'value3', 'value4']);
    });

    it('should handle complex workflow', () => {
      // Initial setup
      metadata.set('user', 'john');
      metadata.set('roles', ['admin', 'user']);
      metadata.add('permissions', 'read');
      metadata.add('permissions', ['write', 'delete']);
      
      // Create a clone and modify
      const cloned = metadata.clone();
      cloned.add('roles', 'guest');
      
      // Merge back - this will merge the cloned data with original
      metadata.merge(cloned);
      
      // After merge, user should have both original and cloned values
      expect(metadata.get('user')).toEqual(['john', 'john']);
      expect(metadata.get('roles')).toEqual(['admin', 'user', 'admin', 'user', 'guest']);
      expect(metadata.get('permissions')).toEqual(['read', 'write', 'delete', 'read', 'write', 'delete']);
    });

    it('should handle Buffer operations in complex scenarios', () => {
      const buffer1 = Buffer.from('data1');
      const buffer2 = Buffer.from('data2');
      
      metadata.set('buffers', [buffer1]);
      metadata.add('buffers', buffer2);
      
      const cloned = metadata.clone();
      const map = cloned.getMap();
      
      expect(map.buffers).toBeInstanceOf(Buffer);
      expect(map.buffers.toString()).toBe('data1');
      expect(cloned.get('buffers')).toHaveLength(2);
      expect(cloned.get('buffers')[0]).not.toBe(buffer1); // Cloned buffer
      expect(cloned.get('buffers')[1]).not.toBe(buffer2); // Cloned buffer
    });
  });
});
