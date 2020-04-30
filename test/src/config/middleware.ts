/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-04-30 15:09:26
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