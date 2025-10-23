import { Controller, KoattyContext } from "koatty_core";
import { GetMapping, PostMapping, PutMapping } from "../../src/index";

@Controller()
export class TestController {
  private ctx: KoattyContext;

  constructor(ctx: KoattyContext) {
    this.ctx = ctx;
  }

  @PostMapping("/test")
  test() {
    return "test";
  }

  @GetMapping("/test1")
  private test1() {
    return "test1";
  }

  @PutMapping("/test2")
  protected test2() {
    return "test2";
  }
}