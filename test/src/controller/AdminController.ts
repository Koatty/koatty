/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2019-11-26 17:38:16
 */
import { Controller, BaseController, Autowired, Logger, Helper } from "../../../src/index";
import { App } from '../App';
import { CommonService } from '../service/CommonService';

@Controller()
export class AdminController extends BaseController {
    app: App;
    // Mo: { rel: false; sortby: any; field: any[]; ispage: boolean; pagesize: number; page: number; };
    // Map: any; //保存查询条件
    // Model: any; //定义模型类,用于判断数据权限
    service: any;

    @Autowired()
    protected commonService: CommonService;

    init() {
        console.log(this.encoding);
        // this.Model = null;
        // this.Mo = { rel: false, sortby: {}, field: [], ispage: true, pagesize: 20, page: 1 };
        // this.Map = {};
    }

    __empty() {
        return this.fail('没有权限访问', {}, 404);
    }

}