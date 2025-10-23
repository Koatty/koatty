import KoaRouter from "@koa/router";
import Koa from "koa";
import { graphqlHTTP } from "koa-graphql";
import { buildSchema } from "koatty_graphql";
import request from 'supertest';
describe("Test", () => {

  const schema = buildSchema(`
    type Query { hello: String }
  `);
  const root = { hello: () => 'world' };

  const app = new Koa();
  const router = new KoaRouter();
  router.all(
    '/graphql',
    graphqlHTTP({
      schema: schema,
      rootValue: root,
      graphiql: true,
    }),
  );
  app.use(router.routes()).use(router.allowedMethods());
  // app.listen(4000);
  test("request", async () => {
    const res = await request(app.callback()).get('/graphql?query={hello}');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ "data": { "hello": "world" } });
  })
})