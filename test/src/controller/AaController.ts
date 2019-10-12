import { Component, Autowired, Controller, Value, BaseController, Param, Get } from '../../../src/index';

@Controller()
export class AaController extends BaseController {
    public ctx: any;
    @Get('/')
    public sayHello(@Param() info: any) {
        return this.json(info);
    }
}