import request from 'supertest';
import { createApplication } from '../../src/index';
import { App } from '../../examples/basic-app/src/App';
import { TestService } from '../../examples/basic-app/src/service/TestService';

test('two bootstrapped applications resolve their own service through HTTP and stop independently', async () => {
  const getUser = jest.spyOn(TestService.prototype, 'getUser').mockImplementation(function(this: TestService, id: number) {
    return Promise.resolve({id, username:this.app.name});
  });
  let a: any, b: any;
  try {
    const starts: any[] = [];
    const boot = (app: any) => {
      app.once('appStart', () => {expect(app.server.getNativeServer().listening).toBe(true);starts.push(app);});
      app.once('loadConfigure', () => { app.config('port','server',0); app.config('protocol','server','http'); });
      app.use(async (ctx: any, next: any) => { ctx.set('x-owner', app.name); await next(); });
    };
    a = await createApplication(App, boot); b = await createApplication(App, boot);
    a.name = 'application-a'; b.name = 'application-b';
    expect(starts).toEqual([]);
    expect(a.container).not.toBe(b.container);
    expect(a.container.get('TestService','SERVICE')).not.toBe(b.container.get('TestService','SERVICE'));
    await new Promise<void>(resolve => a.listen(resolve));
    await new Promise<void>(resolve => b.listen(resolve));
    expect(starts).toEqual([a,b]);
    const na = a.server.getNativeServer(), nb = b.server.getNativeServer();
    expect(na.address().port).not.toBe(nb.address().port);
    const [ra,rb] = await Promise.all([request(na).get('/get?id=1'), request(nb).get('/get?id=2')]);
    expect(ra.headers['x-owner']).toBe('application-a'); expect(rb.headers['x-owner']).toBe('application-b');
    expect(ra.status).toBe(200); expect(rb.status).toBe(200);
    expect(ra.body.data.username).toBe('application-a'); expect(rb.body.data.username).toBe('application-b');
    await a.stop(); a = undefined;
    const after = await request(nb).get('/get?id=3');
    expect(after.status).toBe(200); expect(after.body.data.username).toBe('application-b');
  } finally { if (a) await a.stop(); if (b) await b.stop(); getUser.mockRestore(); }
}, 20000);

test('stopping the last configured application stops batching without destroying the shared logger', async () => {
  const { EventEmitter } = await import('events');
  const { Loader } = await import('../../src/core/Loader');
  const { DefaultLogger } = await import('koatty_logger');
  const { AppEvent, asyncEvent } = await import('koatty_core');
  const make = () => Object.assign(new EventEmitter(), {appDebug:false, env:'production', getMetaData: () => [{config:{}}]});
  const a: any = make(), b: any = make();
  const batch = jest.spyOn(DefaultLogger,'enableBatch');
  const destroy = jest.spyOn(DefaultLogger,'destroy');
  try {
    Loader.SetLogger(a); Loader.SetLogger(b); batch.mockClear();
    expect((Loader as any).loggingApps.size).toBe(2);
    await asyncEvent(a,AppEvent.appStop);
    expect(batch).not.toHaveBeenCalledWith(false);
    await asyncEvent(b,AppEvent.appStop);
    expect(batch).toHaveBeenCalledWith(false); expect(destroy).not.toHaveBeenCalled();
  } finally { DefaultLogger.enableBatch(false); batch.mockRestore(); destroy.mockRestore(); }
});


test('importing a Bootstrap-decorated class under Jest does not start it implicitly', async () => {
  const { Bootstrap, Koatty } = await import('../../src/index');
  const boot = jest.fn();
  @Bootstrap(boot)
  class ImportedApp extends Koatty {}
  expect(ImportedApp).toBeDefined();
  await Promise.resolve();
  expect(boot).not.toHaveBeenCalled();
});

test('embedded startup without a script argv does not throw', async () => {
  const {checkUTRuntime} = await import('../../src/util/Helper');
  const saved = process.argv;
  try { process.argv = [process.execPath]; expect(checkUTRuntime()).toBe(false); }
  finally { process.argv = saved; }
});
