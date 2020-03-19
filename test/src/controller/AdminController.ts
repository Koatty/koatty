/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-03-19 14:09:55
 */
import { Controller, BaseController, Autowired, Logger, Helper, RequestBody, BeforeEach } from "../../../src/index";
import { App } from '../App';
import { CommonService } from '../service/CommonService';

@Controller()
// @BeforeEach("TestAspect")
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

}