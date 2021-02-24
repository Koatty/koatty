/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2019-09-24 11:06:12
 */
export default {
    "test": {
        aa: '111111'
    },
    open_trace: true, //全链路debug/trace，默认: false
    // enable_http2: true, // 是否启用HTTP2,启用需要配置证书
    // https certificate
    key_file: process.env.APP_PATH + "/config/server.key",
    crt_file: process.env.APP_PATH + "/config/server.crt"
};