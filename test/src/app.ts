/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-18 14:32:27
 */
import { Bootstrap, ComponentScan, Autowired, Koatty, ConfiguationScan, logger, helper } from '../../src/index';
// import * as helper from "think_lib";
import * as path from "path";

@Bootstrap()
// @ComponentScan('./test')
// @ConfiguationScan('./test/config')
export class App extends Koatty {

    public init() {
        this.root_path = path.dirname(__dirname);
        // this.app_path = `${this.root_path}${path.sep}src`;
        // this.app_debug = true; //线上环境请将debug模式关闭，即：app_debug:false
    }


}


