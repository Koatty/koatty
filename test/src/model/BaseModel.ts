/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2019-11-14 13:59:47
 */

export class BaseModel {
    config: any;
    constructor(...args: any[]) {
        this.init();
        if (!this.config) {
            // 数据源配置
            if (args[0] && args[0].db_host) {
                this.config = args[0];
            }
            // else {
            //     throw Error("config is null");
            // }
        }
    }

    init() {

    }
}