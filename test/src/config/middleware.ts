/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-01 19:07:09
 */

export default {
    list: ['Models'], //加载的中间件列表
    config: { //中间件配置
        Static: {
            cache: false
        },

        Trace: {
            timeout: 30
        }
    }
};