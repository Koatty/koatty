/*
 * @Description: Payload解析器增强测试
 * @Usage: 测试GraphQL和gRPC解析器的各种功能和边界情况
 * @Author: richen
 * @Date: 2025-01-20 10:00:00
 */

// Mock modules first
jest.mock('koatty_logger', () => ({
  DefaultLogger: { 
    Error: jest.fn()
  }
}));

jest.mock('raw-body', () => jest.fn());
jest.mock('inflation', () => jest.fn());
jest.mock('../src/payload/parser/text', () => ({
  parseText: jest.fn()
}));

import { parseGraphQL } from '../src/payload/parser/graphql';
import { parseGrpc } from '../src/payload/parser/grpc';
import { DefaultLogger } from 'koatty_logger';
import getRawBody from 'raw-body';
import inflate from 'inflation';
import { parseText } from '../src/payload/parser/text';

describe('Payload解析器增强测试', () => {
  let mockCtx: any;
  let mockOpts: any;

  beforeEach(() => {
    mockCtx = {
      req: {
        headers: { 'content-type': 'application/json' },
        body: null
      }
    };
    mockOpts = {
      limit: '1mb',
      encoding: 'utf8'
    };
    jest.clearAllMocks();
  });

  describe('GraphQL解析器测试', () => {
    test('应该成功解析完整的GraphQL请求', async () => {
      const graphqlQuery = JSON.stringify({
        query: 'query GetUser($id: ID!) { user(id: $id) { name email } }',
        variables: { id: '123' },
        operationName: 'GetUser'
      });

      (parseText as jest.Mock).mockResolvedValue(graphqlQuery);

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result).toEqual({
        query: 'query GetUser($id: ID!) { user(id: $id) { name email } }',
        variables: { id: '123' },
        operationName: 'GetUser'
      });
      expect(parseText).toHaveBeenCalledWith(mockCtx, mockOpts);
    });

    test('应该处理只有query的GraphQL请求', async () => {
      const graphqlQuery = JSON.stringify({
        query: 'query { users { name } }'
      });

      (parseText as jest.Mock).mockResolvedValue(graphqlQuery);

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result).toEqual({
        query: 'query { users { name } }',
        variables: {},
        operationName: null
      });
    });

    test('应该处理带有variables但没有operationName的GraphQL请求', async () => {
      const graphqlQuery = JSON.stringify({
        query: 'mutation CreateUser($input: UserInput!) { createUser(input: $input) { id } }',
        variables: { input: { name: 'John', email: 'john@example.com' } }
      });

      (parseText as jest.Mock).mockResolvedValue(graphqlQuery);

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result).toEqual({
        query: 'mutation CreateUser($input: UserInput!) { createUser(input: $input) { id } }',
        variables: { input: { name: 'John', email: 'john@example.com' } },
        operationName: null
      });
    });

    test('应该处理空字符串输入', async () => {
      (parseText as jest.Mock).mockResolvedValue('');

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result).toEqual({});
      expect(DefaultLogger.Error).not.toHaveBeenCalled();
    });

    test('应该处理null输入', async () => {
      (parseText as jest.Mock).mockResolvedValue(null);

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result).toEqual({});
      expect(DefaultLogger.Error).not.toHaveBeenCalled();
    });

    test('应该处理undefined输入', async () => {
      (parseText as jest.Mock).mockResolvedValue(undefined);

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result).toEqual({});
      expect(DefaultLogger.Error).not.toHaveBeenCalled();
    });

    test('应该处理无效的JSON格式', async () => {
      (parseText as jest.Mock).mockResolvedValue('invalid json {');

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result).toEqual({});
      expect(DefaultLogger.Error).toHaveBeenCalledWith('[GraphQLParseError]', expect.any(SyntaxError));
    });

    test('应该处理parseText抛出的错误', async () => {
      const error = new Error('Parse text failed');
      (parseText as jest.Mock).mockRejectedValue(error);

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result).toEqual({});
      expect(DefaultLogger.Error).toHaveBeenCalledWith('[GraphQLParseError]', error);
    });

    test('应该处理不完整的GraphQL对象', async () => {
      const graphqlQuery = JSON.stringify({
        // 缺少query字段
        variables: { id: '123' }
      });

      (parseText as jest.Mock).mockResolvedValue(graphqlQuery);

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result).toEqual({
        query: undefined,
        variables: { id: '123' },
        operationName: null
      });
    });

    test('应该处理复杂的嵌套variables', async () => {
      const graphqlQuery = JSON.stringify({
        query: 'mutation ComplexMutation($input: ComplexInput!) { createComplex(input: $input) { id } }',
        variables: {
          input: {
            user: { name: 'John', email: 'john@example.com' },
            settings: { theme: 'dark', notifications: true },
            tags: ['developer', 'javascript']
          }
        },
        operationName: 'ComplexMutation'
      });

      (parseText as jest.Mock).mockResolvedValue(graphqlQuery);

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result.variables).toEqual({
        input: {
          user: { name: 'John', email: 'john@example.com' },
          settings: { theme: 'dark', notifications: true },
          tags: ['developer', 'javascript']
        }
      });
    });
  });

  describe('gRPC解析器测试', () => {
    test('应该成功解析gRPC请求', async () => {
      const mockBuffer = Buffer.from('test grpc data');
      const mockInflatedStream = { pipe: jest.fn() };
      
      (inflate as jest.Mock).mockReturnValue(mockInflatedStream);
      (getRawBody as jest.Mock).mockResolvedValue(mockBuffer);

      const result = await parseGrpc(mockCtx, mockOpts);

      // gRPC 应该返回原始 Buffer，不是字符串
      expect(result).toEqual({ body: mockBuffer });
      expect(Buffer.isBuffer(result.body)).toBe(true);
      expect(inflate).toHaveBeenCalledWith(mockCtx.req);
      expect(getRawBody).toHaveBeenCalledWith(mockInflatedStream, mockOpts);
    });

    test('应该处理空的gRPC数据', async () => {
      const mockBuffer = Buffer.from('');
      const mockInflatedStream = { pipe: jest.fn() };
      
      (inflate as jest.Mock).mockReturnValue(mockInflatedStream);
      (getRawBody as jest.Mock).mockResolvedValue(mockBuffer);

      const result = await parseGrpc(mockCtx, mockOpts);

      expect(result).toEqual({ body: mockBuffer });
      expect(Buffer.isBuffer(result.body)).toBe(true);
    });

    test('应该处理二进制gRPC数据', async () => {
      const binaryData = Buffer.from([0x08, 0x96, 0x01, 0x12, 0x04, 0x74, 0x65, 0x73, 0x74]);
      const mockInflatedStream = { pipe: jest.fn() };
      
      (inflate as jest.Mock).mockReturnValue(mockInflatedStream);
      (getRawBody as jest.Mock).mockResolvedValue(binaryData);

      const result = await parseGrpc(mockCtx, mockOpts);

      expect(result).toEqual({ body: binaryData });
      expect(Buffer.isBuffer(result.body)).toBe(true);
    });

    test('应该处理inflate错误', async () => {
      const error = new Error('Inflation failed');
      (inflate as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const result = await parseGrpc(mockCtx, mockOpts);

      expect(result).toEqual({});
      expect(DefaultLogger.Error).toHaveBeenCalledWith('[GrpcParseError]', error);
    });

    test('应该处理getRawBody错误', async () => {
      const mockInflatedStream = { pipe: jest.fn() };
      const error = new Error('Raw body parsing failed');
      
      (inflate as jest.Mock).mockReturnValue(mockInflatedStream);
      (getRawBody as jest.Mock).mockRejectedValue(error);

      const result = await parseGrpc(mockCtx, mockOpts);

      expect(result).toEqual({});
      expect(DefaultLogger.Error).toHaveBeenCalledWith('[GrpcParseError]', error);
    });

         test('应该处理大型gRPC数据', async () => {
       const largeData = Buffer.alloc(1024 * 1024, 'a'); // 1MB of 'a'
       const mockInflatedStream = { pipe: jest.fn() };
       
       (inflate as jest.Mock).mockReturnValue(mockInflatedStream);
       (getRawBody as jest.Mock).mockResolvedValue(largeData);

       const result = await parseGrpc(mockCtx, mockOpts);

       expect(result).toEqual({ body: largeData });
       expect(Buffer.isBuffer(result.body)).toBe(true);
       if ('body' in result && Buffer.isBuffer(result.body)) {
         expect(result.body.length).toBe(1024 * 1024);
       }
     });

         test('应该处理不同的选项配置', async () => {
       const customOpts = {
         limit: '2mb',
         encoding: 'utf8' as const,
         extTypes: {},
         multiples: false,
         keepExtensions: false
       };
       const mockBuffer = Buffer.from('test data');
       const mockInflatedStream = { pipe: jest.fn() };
       
       (inflate as jest.Mock).mockReturnValue(mockInflatedStream);
       (getRawBody as jest.Mock).mockResolvedValue(mockBuffer);

       const result = await parseGrpc(mockCtx, customOpts);

       expect(result).toEqual({ body: mockBuffer });
       expect(Buffer.isBuffer(result.body)).toBe(true);
       expect(getRawBody).toHaveBeenCalledWith(mockInflatedStream, customOpts);
     });

    test('应该处理网络错误', async () => {
      const mockInflatedStream = { pipe: jest.fn() };
      const networkError = new Error('Network error');
      
      (inflate as jest.Mock).mockReturnValue(mockInflatedStream);
      (getRawBody as jest.Mock).mockRejectedValue(networkError);

      const result = await parseGrpc(mockCtx, mockOpts);

      expect(result).toEqual({});
      expect(DefaultLogger.Error).toHaveBeenCalledWith('[GrpcParseError]', networkError);
    });

    test('应该处理超时错误', async () => {
      const mockInflatedStream = { pipe: jest.fn() };
      const timeoutError = new Error('Request timeout');
      
      (inflate as jest.Mock).mockReturnValue(mockInflatedStream);
      (getRawBody as jest.Mock).mockRejectedValue(timeoutError);

      const result = await parseGrpc(mockCtx, mockOpts);

      expect(result).toEqual({});
      expect(DefaultLogger.Error).toHaveBeenCalledWith('[GrpcParseError]', timeoutError);
    });
  });

  describe('边界情况和错误处理', () => {
    test('GraphQL解析器应该处理非对象JSON', async () => {
      (parseText as jest.Mock).mockResolvedValue('"just a string"');

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result).toEqual({
        query: undefined,
        variables: {},
        operationName: null
      });
    });

    test('GraphQL解析器应该处理数组JSON', async () => {
      (parseText as jest.Mock).mockResolvedValue('[1, 2, 3]');

      const result = await parseGraphQL(mockCtx, mockOpts);

      expect(result).toEqual({
        query: undefined,
        variables: {},
        operationName: null
      });
    });

         test('gRPC解析器应该处理null请求对象', async () => {
       const mockCtxWithNullReq = { req: null } as any;
       const error = new Error('Cannot read properties of null');
       
       (inflate as jest.Mock).mockImplementation(() => {
         throw error;
       });

       const result = await parseGrpc(mockCtxWithNullReq, mockOpts);

       expect(result).toEqual({});
       expect(DefaultLogger.Error).toHaveBeenCalledWith('[GrpcParseError]', error);
     });
  });
}); 