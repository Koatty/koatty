/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-02-24 16:06:59
 */

export default {
    list: ['Models', 'Zadtest'], //加载的中间件列表
    config: { //中间件配置
        Static: {
            cache: false
        },

        Trace: {
            timeout: 30
        }
    }
};