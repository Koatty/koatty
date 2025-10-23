/*
 * @Description: Utils Tests
 * @Usage: Test utility functions
 * @Author: richen
 * @Date: 2025-01-20 10:00:00
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { parsePath, deleteFiles } from '../src/utils/path';
import { promises as fsPromise } from 'fs';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    unlink: jest.fn(),
  }
}));

jest.mock('koatty_logger', () => ({
  DefaultLogger: {
    Error: jest.fn(),
  }
}));

const mockFsPromise = fsPromise as jest.Mocked<typeof fsPromise>;
const mockLogger = require('koatty_logger').DefaultLogger;

describe('Utils - Path Functions', () => {
  describe('parsePath', () => {
    it('should return root path when path is empty', () => {
      expect(parsePath('')).toBe('/');
    });

    it('should return root path when path is undefined', () => {
      expect(parsePath(undefined as any)).toBe('/');
    });

    it('should return root path when path is null', () => {
      expect(parsePath(null as any)).toBe('/');
    });

    it('should preserve single slash root path', () => {
      expect(parsePath('/')).toBe('/');
    });

    it('should preserve simple paths without trailing slash', () => {
      expect(parsePath('/api')).toBe('/api');
      expect(parsePath('/users')).toBe('/users');
      expect(parsePath('/api/v1')).toBe('/api/v1');
    });

    it('should remove trailing slash from paths', () => {
      expect(parsePath('/api/')).toBe('/api');
      expect(parsePath('/users/')).toBe('/users');
      expect(parsePath('/api/v1/')).toBe('/api/v1');
    });

    it('should remove multiple trailing slashes', () => {
      expect(parsePath('/api//')).toBe('/api');
      expect(parsePath('/users///')).toBe('/users');
    });

    it('should handle paths with double slashes in middle', () => {
      expect(parsePath('/api//users')).toBe('/api/users');
      expect(parsePath('/api///users//groups')).toBe('/api/users/groups');
    });

    it('should handle complex paths with multiple issues', () => {
      expect(parsePath('/api//users///')).toBe('/api/users');
      expect(parsePath('//api//users//')).toBe('/api/users');
    });

    it('should handle paths starting without slash', () => {
      expect(parsePath('api')).toBe('api');
      expect(parsePath('api/users')).toBe('api/users');
    });

    it('should handle very short paths', () => {
      expect(parsePath('/a')).toBe('/a');
      expect(parsePath('/a/')).toBe('/a');
    });

    it('should handle empty string correctly', () => {
      expect(parsePath('')).toBe('/');
    });

    it('should preserve path parameters and query strings', () => {
      expect(parsePath('/users/:id')).toBe('/users/:id');
      expect(parsePath('/api/users/:id/')).toBe('/api/users/:id');
    });
  });

  describe('deleteFiles', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should delete single file successfully', async () => {
      const files = {
        file1: { path: '/tmp/test1.txt' }
      };

      mockFsPromise.access.mockResolvedValue(undefined);
      mockFsPromise.unlink.mockResolvedValue(undefined);

      await deleteFiles(files);

      expect(mockFsPromise.access).toHaveBeenCalledWith('/tmp/test1.txt');
      expect(mockFsPromise.unlink).toHaveBeenCalledWith('/tmp/test1.txt');
      expect(mockLogger.Error).not.toHaveBeenCalled();
    });

    it('should delete multiple files successfully', async () => {
      const files = {
        file1: { path: '/tmp/test1.txt' },
        file2: { path: '/tmp/test2.txt' },
        file3: { path: '/tmp/test3.txt' }
      };

      mockFsPromise.access.mockResolvedValue(undefined);
      mockFsPromise.unlink.mockResolvedValue(undefined);

      await deleteFiles(files);

      expect(mockFsPromise.access).toHaveBeenCalledTimes(3);
      expect(mockFsPromise.access).toHaveBeenCalledWith('/tmp/test1.txt');
      expect(mockFsPromise.access).toHaveBeenCalledWith('/tmp/test2.txt');
      expect(mockFsPromise.access).toHaveBeenCalledWith('/tmp/test3.txt');

      expect(mockFsPromise.unlink).toHaveBeenCalledTimes(3);
      expect(mockFsPromise.unlink).toHaveBeenCalledWith('/tmp/test1.txt');
      expect(mockFsPromise.unlink).toHaveBeenCalledWith('/tmp/test2.txt');
      expect(mockFsPromise.unlink).toHaveBeenCalledWith('/tmp/test3.txt');

      expect(mockLogger.Error).not.toHaveBeenCalled();
    });

    it('should handle file access errors gracefully', async () => {
      const files = {
        file1: { path: '/tmp/nonexistent.txt' }
      };

      const accessError = new Error('File not found');
      mockFsPromise.access.mockRejectedValue(accessError);

      await deleteFiles(files);

      expect(mockFsPromise.access).toHaveBeenCalledWith('/tmp/nonexistent.txt');
      expect(mockFsPromise.unlink).not.toHaveBeenCalled();
      expect(mockLogger.Error).toHaveBeenCalledWith(accessError);
    });

    it('should handle file deletion errors gracefully', async () => {
      const files = {
        file1: { path: '/tmp/readonly.txt' }
      };

      const unlinkError = new Error('Permission denied');
      mockFsPromise.access.mockResolvedValue(undefined);
      mockFsPromise.unlink.mockRejectedValue(unlinkError);

      await deleteFiles(files);

      expect(mockFsPromise.access).toHaveBeenCalledWith('/tmp/readonly.txt');
      expect(mockFsPromise.unlink).toHaveBeenCalledWith('/tmp/readonly.txt');
      expect(mockLogger.Error).toHaveBeenCalledWith(unlinkError);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const files = {
        file1: { path: '/tmp/success.txt' },
        file2: { path: '/tmp/fail-access.txt' },
        file3: { path: '/tmp/fail-unlink.txt' },
        file4: { path: '/tmp/success2.txt' }
      };

      // Set up different behaviors for different files
      mockFsPromise.access
        .mockResolvedValueOnce(undefined) // file1 - success
        .mockRejectedValueOnce(new Error('Access denied')) // file2 - access fails
        .mockResolvedValueOnce(undefined) // file3 - access succeeds
        .mockResolvedValueOnce(undefined); // file4 - success

      mockFsPromise.unlink
        .mockResolvedValueOnce(undefined) // file1 - success
        .mockRejectedValueOnce(new Error('Unlink failed')) // file3 - unlink fails
        .mockResolvedValueOnce(undefined); // file4 - success

      await deleteFiles(files);

      expect(mockFsPromise.access).toHaveBeenCalledTimes(4);
      expect(mockFsPromise.unlink).toHaveBeenCalledTimes(3); // For file1, file3, and file4
      expect(mockLogger.Error).toHaveBeenCalledTimes(2); // For file2 and file3 errors
    });

    it('should handle empty files object', async () => {
      await deleteFiles({});

      expect(mockFsPromise.access).not.toHaveBeenCalled();
      expect(mockFsPromise.unlink).not.toHaveBeenCalled();
      expect(mockLogger.Error).not.toHaveBeenCalled();
    });

    it('should handle files with empty path', async () => {
      const files = {
        file1: { path: '' },
        file2: { path: '/tmp/normal.txt' }
      };

      mockFsPromise.access.mockResolvedValue(undefined);
      mockFsPromise.unlink.mockResolvedValue(undefined);

      await deleteFiles(files);

      expect(mockFsPromise.access).toHaveBeenCalledWith('');
      expect(mockFsPromise.access).toHaveBeenCalledWith('/tmp/normal.txt');
    });

    it('should handle concurrent file operations correctly', async () => {
      const files = {
        file1: { path: '/tmp/concurrent1.txt' },
        file2: { path: '/tmp/concurrent2.txt' },
        file3: { path: '/tmp/concurrent3.txt' }
      };

      // Simulate different timing for operations
      mockFsPromise.access
        .mockImplementation((path) => new Promise(resolve => 
          setTimeout(() => resolve(undefined), Math.random() * 10)))
        .mockImplementation((path) => new Promise(resolve => 
          setTimeout(() => resolve(undefined), Math.random() * 10)))
        .mockImplementation((path) => new Promise(resolve => 
          setTimeout(() => resolve(undefined), Math.random() * 10)));

      mockFsPromise.unlink.mockResolvedValue(undefined);

      await deleteFiles(files);

      expect(mockFsPromise.access).toHaveBeenCalledTimes(3);
      expect(mockFsPromise.unlink).toHaveBeenCalledTimes(3);
      expect(mockLogger.Error).not.toHaveBeenCalled();
    });

    it('should return Promise.all result', async () => {
      const files = {
        file1: { path: '/tmp/test.txt' }
      };

      mockFsPromise.access.mockResolvedValue(undefined);
      mockFsPromise.unlink.mockResolvedValue(undefined);

      const result = await deleteFiles(files);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });
}); 