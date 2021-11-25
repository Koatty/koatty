/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-05-19 14:31:04
 */
import { Controller, GetMapping, Autowired, RequestMethod, PostMapping, Before, After, RequestBody, Get, Helper, Post, RequestParam, IOCContainer, PathVariable, BeforeEach, Exception, prevent, Logger, BaseController, KoattyContext, RequestMapping } from "../../../src/index";
import { Validated, Valid } from "koatty_validation";
import { App } from '../App';
import { TestDto } from "../dto/TestDto";


@Controller("/helloworld.Greeter")
export class GrpcController extends BaseController {
    app: App;
    ctx: KoattyContext;

    @RequestMapping("/SayHello")
    @Validated()
    async Get(@RequestBody() data: TestDto) {
        console.log(this.ctx.metadata);

        console.log(data instanceof TestDto);

        // this.ctx.throw(403);
        return data;
    }

}
