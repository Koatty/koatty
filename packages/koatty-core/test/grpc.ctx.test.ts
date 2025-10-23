import { IRpcServerCall, IRpcServerCallback, KoattyContext } from '../src/IContext';
import { KoattyMetadata } from '../src/Metadata';
import { App } from "./app";

describe('createGrpcContext', () => {
  let app = new App();
  let ctx: KoattyContext;
  let call: IRpcServerCall<any, any>;
  let callback: IRpcServerCallback<any>;

  beforeEach(() => {
    jest.useFakeTimers();
    // 模拟 call 对象
    call = {
      metadata: {
        toJSON: jest.fn().mockReturnValue({ key: 'value' }),  // 模拟 metadata.toJSON 方法
        clone: jest.fn().mockReturnThis(),  // 模拟 metadata.clone 方法
        add: jest.fn(),  // 模拟 metadata.add 方法
      },
      request: { foo: 'bar' },  // 模拟请求体
      sendMetadata: jest.fn(),  // 模拟 sendMetadata 方法
      handler: { path: 'testPath' },  // 模拟 handler.path
    } as unknown as IRpcServerCall<any, any>;

    // 模拟 callback
    callback = jest.fn();

    ctx = app.createContext(call, callback, 'grpc');
    // ctx.set = jest.fn();
  })
  afterAll(done => {
    done();
    jest.clearAllMocks();
  });

  test('should set status to 200', () => {
    expect(ctx.status).toBe(200);
  });

  test('should define rpc property on context', () => {
    expect(ctx.rpc).toEqual({ call, callback });
  });

  test('should define metadata property on context', () => {
    expect(ctx.metadata).toBeInstanceOf(KoattyMetadata);
  });

  test('should set originalPath metadata', () => {
    expect(ctx.getMetaData('originalPath')).toEqual(["testPath"]);
  });

  test('should set _body metadata', () => {
    const request = [{ foo: 'bar' }];
    (call as any).request = request;
    expect(ctx.getMetaData('_body')).toEqual(request);
  });

  test('should define sendMetadata method on context', () => {
    expect(typeof ctx.sendMetadata).toBe('function');
  });

  test('should call sendMetadata with correct metadata', () => {
    const data = new KoattyMetadata();
    data.set('key', 'value');
    ctx.sendMetadata(data);
    expect(call.sendMetadata).toHaveBeenCalledTimes(1);
    expect(call.sendMetadata).toHaveBeenCalledWith(expect.any(Object));
  });
});
