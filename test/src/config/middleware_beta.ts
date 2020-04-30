/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-04-30 15:02:27
 */

export default {
    list: ['Static', 'Models'], //加载的中间件列表
    config: { //中间件配置
        // Static: {
        //     cache: false
        // },

        Trace: {
            timeout: 30
        }
    }
};