/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-04-30 14:52:34
 */

export default {
    list: [], //加载的中间件列表,执行顺序按照数组元素顺序
    config: { //中间件配置
        "TraceMiddleware": {
            "timeout": 10, //HTTP request timeout time(seconds)
            "error_code": 500, //default error status
            "error_path": "" //template directory configuration. Place 404.html, 502.html, etc. in this directory, the framework will automatically render according to status (support template variables, rely on think_view middleware; if think_view middleware is not loaded, only output template content)
        },

        "PayloadMiddleware": {
            "extTypes": {
                "json": ['application/json'],
                "form": ['application/x-www-form-urlencoded'],
                "text": ['text/plain'],
                "multipart": ['multipart/form-data'],
                "xml": ['text/xml']
            },
            "limit": '20mb',
            "encoding": 'utf-8',
            "multiples": true,
            "keepExtensions": true
        }
    }
};