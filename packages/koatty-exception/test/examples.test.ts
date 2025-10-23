/**
 * 使用示例测试
 * Example Usage Tests
 */

import { 
  Exception, 
  ExceptionHandler, 
  Output, 
  CommonErrorCode,
  setExceptionConfig,
  prevent,
  isException,
  toSafeError
} from '../src/index';

describe('Usage Examples', () => {
  beforeEach(() => {
    // 重置配置
    setExceptionConfig({
      enableStackTrace: false,
      logFormat: 'json',
      maxStackLength: 1000
    });
  });

  describe('Basic Exception Usage', () => {
    it('should create basic exception', () => {
      const error = new Exception('基础错误', CommonErrorCode.GENERAL_ERROR, 500);
      
      expect(error.message).toBe('基础错误');
      expect(error.code).toBe(CommonErrorCode.GENERAL_ERROR);
      expect(error.status).toBe(500);
    });

    it('should support method chaining', () => {
      const error = new Exception('验证失败')
        .setCode(CommonErrorCode.VALIDATION_ERROR)
        .setStatus(400)
        .setContext({
          requestId: 'req-12345',
          path: '/api/users',
          method: 'POST',
          field: 'email' // 自定义字段
        });

      expect(error.code).toBe(CommonErrorCode.VALIDATION_ERROR);
      expect(error.status).toBe(400);
      expect(error.context?.requestId).toBe('req-12345');
      expect(error.context?.field).toBe('email');
    });
  });

  describe('Custom Exception Handlers', () => {
    @ExceptionHandler()
    class ValidationException extends Exception {
      constructor(message: string, field?: string) {
        super(message, CommonErrorCode.VALIDATION_ERROR, 400);
        
        if (field) {
          this.setContext({ field });
        }
      }
    }

    @ExceptionHandler()
    class BusinessException extends Exception {
      constructor(message: string, businessCode: string) {
        super(message, CommonErrorCode.GENERAL_ERROR, 400);
        this.setContext({ businessCode });
      }
    }

    it('should create validation exception', () => {
      const error = new ValidationException('邮箱格式不正确', 'email');
      
      expect(error.message).toBe('邮箱格式不正确');
      expect(error.code).toBe(CommonErrorCode.VALIDATION_ERROR);
      expect(error.context?.field).toBe('email');
    });

    it('should create business exception', () => {
      const error = new BusinessException('余额不足', 'INSUFFICIENT_BALANCE');
      
      expect(error.message).toBe('余额不足');
      expect(error.context?.businessCode).toBe('INSUFFICIENT_BALANCE');
    });
  });

  describe('Output Usage', () => {
    it('should create success responses', () => {
      const response = Output.ok('用户创建成功', { 
        id: 1, 
        name: '张三', 
        email: 'zhangsan@example.com' 
      });

      expect(response.code).toBe(0);
      expect(response.message).toBe('用户创建成功');
      expect(response.data.id).toBe(1);
    });

    it('should create error responses', () => {
      const response = Output.fail('用户名已存在', null, CommonErrorCode.RESOURCE_CONFLICT);

      expect(response.code).toBe(CommonErrorCode.RESOURCE_CONFLICT);
      expect(response.message).toBe('用户名已存在');
      expect(response.data).toBeNull();
    });

    it('should create paginated responses', () => {
      const users = [
        { id: 1, name: '用户1' },
        { id: 2, name: '用户2' },
        { id: 3, name: '用户3' }
      ];
      
      const response = Output.paginate(users, 100, 2, 10, '用户列表获取成功');

      expect(response.code).toBe(0);
      expect(response.message).toBe('用户列表获取成功');
      expect(response.data.items).toEqual(users);
      expect(response.data.pagination.total).toBe(100);
      expect(response.data.pagination.page).toBe(2);
    });

    it('should create responses with metadata', () => {
      const data = [{ id: 1, name: '用户1' }];
      const response = Output.withMeta('查询成功', data, {
        version: '1.0',
        executionTime: 45,
        cached: false
      });

      expect(response.code).toBe(0);
      expect(response.message).toBe('查询成功');
      expect(response.data.data).toEqual(data);
      expect(response.data.meta?.version).toBe('1.0');
    });
  });

  describe('Configuration Usage', () => {
    it('should apply global configuration', () => {
      setExceptionConfig({
        enableStackTrace: true,
        logFormat: 'text',
        maxStackLength: 500,
        customErrorFormat: (error) => ({
          errorId: `ERR-${error.code}`,
          type: error.constructor.name,
          message: error.message
        })
      });

      const error = new Exception('配置测试错误');
      const json = error.toJSON();

      expect(json).toHaveProperty('type');
      expect(json).toHaveProperty('message');
    });
  });

  describe('Utility Functions', () => {

    it('should identify exceptions correctly', () => {
      const regularError = new Error('普通错误');
      const customException = new Exception('自定义异常');
      const exceptionLikeObject = {
        type: 'Exception',
        message: 'Test',
        code: 1,
        status: 400
      };

      expect(isException(regularError)).toBe(false);
      expect(isException(customException)).toBe(true);
      expect(isException(exceptionLikeObject)).toBe(true);
    });

    it('should convert values to safe errors', () => {
      const stringError = toSafeError('字符串错误');
      const numberError = toSafeError(404);
      const objectError = toSafeError({ message: '对象错误' });
      const nullError = toSafeError(null);

      expect(stringError.message).toBe('字符串错误');
      expect(numberError.message).toBe('404');
      expect(objectError.message).toBe('对象错误');
      expect(nullError.message).toBe('Unknown error occurred');
    });
  });

  describe('Business Scenarios', () => {
    // 自定义异常类
    @ExceptionHandler()
    class ValidationException extends Exception {
      constructor(message: string, field?: string) {
        super(message, CommonErrorCode.VALIDATION_ERROR, 400);
        if (field) {
          this.setContext({ field });
        }
      }
    }

    @ExceptionHandler() 
    class BusinessException extends Exception {
      constructor(message: string, businessCode: string) {
        super(message, CommonErrorCode.GENERAL_ERROR, 400);
        this.setContext({ businessCode });
      }
    }

    // 模拟用户服务
    class UserService {
      static async createUser(userData: { email: string; name: string }) {
        // 邮箱格式验证
        if (!userData.email.includes('@')) {
          throw new ValidationException('邮箱格式不正确', 'email');
        }
        
        // 用户名重复检查
        if (userData.name === 'admin') {
          throw new BusinessException('用户名已被占用', 'USERNAME_TAKEN');
        }
        
        // 创建成功
        return Output.ok('用户创建成功', {
          id: Math.random(),
          ...userData,
          createdAt: new Date().toISOString()
        });
      }
      
      static async getUsers(page: number = 1, pageSize: number = 10) {
        const users = Array.from({ length: pageSize }, (_, i) => ({
          id: (page - 1) * pageSize + i + 1,
          name: `用户${(page - 1) * pageSize + i + 1}`,
          email: `user${(page - 1) * pageSize + i + 1}@example.com`
        }));
        
        return Output.paginate(users, 100, page, pageSize);
      }
    }

    it('should handle validation errors', async () => {
      await expect(
        UserService.createUser({ email: 'invalid-email', name: 'test' })
      ).rejects.toThrow('邮箱格式不正确');
    });

    it('should handle business errors', async () => {
      await expect(
        UserService.createUser({ email: 'admin@example.com', name: 'admin' })
      ).rejects.toThrow('用户名已被占用');
    });

    it('should create user successfully', async () => {
      const result = await UserService.createUser({ 
        email: 'user@example.com', 
        name: 'normaluser' 
      });

      expect(result.code).toBe(0);
      expect(result.message).toBe('用户创建成功');
      expect(result.data.email).toBe('user@example.com');
    });

    it('should get users with pagination', async () => {
      const result = await UserService.getUsers(2, 5);

      expect(result.code).toBe(0);
      expect(result.data.items).toHaveLength(5);
      expect(result.data.pagination.page).toBe(2);
      expect(result.data.pagination.pageSize).toBe(5);
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle different error types', () => {
      const errors = [
        new Error('普通错误'),
        new Exception('异常错误'),
        '字符串错误',
        { code: 1001, message: '代码错误对象' },
        null,
        undefined,
        404
      ];
      
      errors.forEach((error) => {
        const safeError = toSafeError(error);
        const isExc = isException(error);
        
        expect(safeError).toBeInstanceOf(Error);
        expect(typeof isExc).toBe('boolean');
      });
    });

  });
}); 