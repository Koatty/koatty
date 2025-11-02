import request from 'supertest';
import { App } from '../examples/basic-app/src/App';
import { ExecBootStrap, KoattyApplication } from '../src/index';

describe('UT example', () => {

  let app: KoattyApplication;
  beforeAll(async () => {
    jest.useFakeTimers();
    // test env
    process.env.KOATTY_ENV = 'development';
    process.execArgv.push("--debug");
    app = await ExecBootStrap()(App);
    // app.use(async (ctx: any) => {
    //   ctx.body = 'Hello, koatty!';
    // });
  });

  afterAll(done => {
    done();
    jest.clearAllMocks();
  });

  it('request', async () => {
    const res = await request(app.callback()).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ "code": 0, "data": null, "message": "Hello, koatty!" });
  });
});