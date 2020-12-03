/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:15:36
 */
import { Bootstrap, ComponentScan, Autowired, Koatty, ConfigurationScan, Logger, Helper, EnableScheduleLock, EnableCacheStore } from '../../src/index';
import * as path from "path";
@EnableCacheStore()
@EnableScheduleLock()
@Bootstrap((app: any) => {
    //调整libuv线程池大小
    // process.env.UV_THREADPOOL_SIZE = "128";
    //忽略https自签名验证
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    console.log("bootFunc");
})
// @ComponentScan('./test')
// @ConfigurationScan('./test/config')
export class App extends Koatty {
    rootPath: string;
    mm1: any;
    mm2: any;
    test: string;

    public init() {
        this.rootPath = path.dirname(__dirname);
        // this.appPath = `${this.rootPath}${path.sep}src`;
        // this.appDebug = false; //线上环境请将debug模式关闭，即：appDebug:false
    }
}


