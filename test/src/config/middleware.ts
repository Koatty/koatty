/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-01 01:23:26
 */

export default {
    list: ['Static', 'Models', 'Zadtest'], //加载的中间件列表
    config: { //中间件配置
        Static: {
            cache: false
        },

        Trace: {
            timeout: 30
        }
    }
};