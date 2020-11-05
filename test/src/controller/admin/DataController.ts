/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-03-18 15:44:40
 */
// tslint:disable-next-line: no-implicit-dependencies
import { Controller, GetMapping, Get, Autowired, Post, PostMapping, BaseController } from "../../../../src/index";
import { App } from '../../App';
import { AdminController } from "../AdminController";
import { DataService } from "../../service/DataService";

@Controller("/admin/data")
export class DataController extends AdminController {
    app: App;
    @Autowired()
    service: DataService;

    @GetMapping("/")
    @GetMapping("/index")
    async index(@Get() param: any) {
        console.log(this.commonService);
        return this.ok("查询成功", {});
    }
}
