/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-05-19 14:31:04
 */
import { Controller, GetMapping, Autowired, RequestMethod, PostMapping, Before, After, RequestBody, Get, Helper, Post, RequestParam, IOCContainer, PathVariable, BeforeEach, Exception, prevent, Logger, BaseController, KoattyContext, RequestMapping } from "../../../src/index";
import { Validated, Valid } from "koatty_validation";
import { App } from '../App';


@Controller("/Details")
export class DetailsController extends BaseController {
    app: App;
    ctx: KoattyContext;

    @RequestMapping("/Get")
    async Get(@RequestBody() @Valid("IsNotEmpty") data: any) {
        console.log(this.ctx.metadata);

        // this.ctx.throw(403);
        return data;
    }

}
