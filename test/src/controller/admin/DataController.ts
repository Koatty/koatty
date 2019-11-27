/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2019-11-26 21:54:17
 */
// tslint:disable-next-line: no-implicit-dependencies
import * as globby from 'globby';
import { Controller, GetMaping, Get, Autowired, Post, PostMaping, BaseController } from "../../../../src/index";
import { App } from '../../App';
import { AdminController } from "../AdminController";
import { DataService } from "../../service/DataService";

@Controller("/admin/data")
export class DataController extends AdminController {
    app: App;
    @Autowired()
    service: DataService;

    @GetMaping("/")
    @GetMaping("/index")
    async index(@Get() param: any) {
        console.log(this.commonService);
        return this.ok("查询成功", {});
    }
}
