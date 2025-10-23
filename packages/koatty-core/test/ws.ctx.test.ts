import { IncomingMessage } from 'http';
import { IWebSocket, KoattyContext } from '../src/IContext';
import { KoattyMetadata } from '../src/Metadata';
import { App } from "./app";

describe('createWsContext', () => {
  let app = new App();

  let ctx: KoattyContext;
  let req: IncomingMessage & { data: Buffer | ArrayBuffer | Buffer[] };
  let socket: IWebSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    // 模拟对象
    req = { data: Buffer.from('test data') } as IncomingMessage & { data: Buffer | ArrayBuffer | Buffer[] };
    socket = {} as IWebSocket;

    ctx = app.createContext(req, socket, 'ws');
    // ctx.set = jest.fn();
  })
  afterAll(done => {
    done();
    jest.clearAllMocks();
  });

  test('should set status to 200', () => {
    expect(ctx.status).toBe(200);
  });

  test('should define websocket property on context', () => {
    expect(ctx.websocket).toEqual(socket);
  });

  test('should define metadata property on context', () => {
    expect(ctx.metadata).toBeInstanceOf(KoattyMetadata);
  });

  test('should set _body metadata', () => {
    expect(ctx.getMetaData('_body')).toEqual(["test data"]);
  });

  test('should define sendMetadata method on context', () => {
    expect(typeof ctx.sendMetadata).toBe('function');
  });

  test('should process null data', () => {
    (<any>req).data = undefined;
    const result = app.createContext(req, socket, 'ws');

    expect(result.status).toBe(200);
    expect(result.getMetaData('_body')).toEqual([""]);
  });
});
