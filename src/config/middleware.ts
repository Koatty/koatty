/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-28 01:24:12
 */

export default {
    list: [], //加载的中间件列表
    config: { //中间件配置
        Static: {
            dir: "/static", //resource path
            prefix: "/", //resource prefix 
            gzip: true, //enable gzip
            filter: [], //function or (not in)array[".exe", ".zip"]
            maxAge: 3600 * 24 * 7, //cache maxAge seconds
            alias: {}, //resource path file alias {key: path}
            preload: true, //preload files
            cache: true //resource cache
        },

        Trace: {
            timeout: 30, //http请求超时时间,单位s
            error_code: 500, //报错时的状态码
            error_no_key: "code", //错误号的key
            error_msg_key: "message", //错误消息的key
            error_path: "" //错误模板目录配置.该目录下放置404.html、502.html等,框架会自动根据status进行渲染(支持模板变量,依赖think_view中间件;如果think_view中间件未加载,仅输出模板内容)
        }
    }
};