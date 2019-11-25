/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-25 09:55:36
 */
import { Bootstrap, ComponentScan, Autowired, Koatty, ConfiguationScan, Logger, Helper } from '../../src/index';
import * as path from "path";

@Bootstrap((app: any) => {
    //调整libuv线程池大小
    process.env.UV_THREADPOOL_SIZE = "128";
    //忽略https自签名验证
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    //运行环境
    process.env.RUN_TIME = 'alpha';
    console.log("bootFunc");
})
// @ComponentScan('./test')
// @ConfiguationScan('./test/config')
export class App extends Koatty {
    root_path: string;
    mm1: any;
    mm2: any;

    public init() {
        this.root_path = path.dirname(__dirname);
        // this.app_path = `${this.root_path}${path.sep}src`;
        // this.app_debug = true; //线上环境请将debug模式关闭，即：app_debug:false
    }
}


