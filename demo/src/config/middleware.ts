/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-11 13:54:18
 */

export default {
    list: ['ModelsMiddleware', 'ZadtestMiddleware'], //加载的中间件列表
    config: { //中间件配置

        TraceMiddleware: {
            timeout: 30
        }
    }
};