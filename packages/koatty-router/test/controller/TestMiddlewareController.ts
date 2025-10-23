import { Controller, KoattyContext } from "koatty_core";
import { GetMapping, PostMapping } from "../../src/index";

// 模拟中间件类
export class TestMiddleware {
  async run(ctx: KoattyContext, next: any) {
    ctx.middlewareExecuted = true;
    await next();
  }
}

export class AuthMiddleware {
  async run(ctx: KoattyContext, next: any) {
    ctx.authChecked = true;
    await next();
  }
}

@Controller("/api")
export class TestMiddlewareController {
  private ctx: KoattyContext;

  constructor(ctx: KoattyContext) {
    this.ctx = ctx;
  }

  @GetMapping("/test")
  test() {
    return "test with middleware";
  }

  @PostMapping("/create")
  create() {
    return "created";
  }
} 