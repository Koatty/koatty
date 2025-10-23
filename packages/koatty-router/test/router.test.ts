import { injectRouter } from "../src/utils/inject";
import { App } from "./app";
import { TestController } from "./controller/TestController";

describe("injectRouter", () => {
  let app;
  beforeAll(async () => {
    process.env.APP_PATH = "./test";
    app = new App("");
  })
  test("NoPrivateMapping", async () => {
    const routers = await injectRouter(app, TestController);
    expect(Object.keys(routers || {}).length).toBe(1);
  })
})