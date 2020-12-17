/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-04-30 14:52:34
 */

export default {
    // List of loaded middleware(except for the middleware loaded by default), 
    // executed in the order of elements
    list: [],
    config: { // middleware configuration
        // The default is off, if you need to enable it, modify it to 
        // "StaticMiddleware": {
        //     dir: '/static', // resource path
        //     prefix: '', // the url prefix you wish to add, default to ''
        //     alias: {}, // object map of aliases. See below
        //     gzip: true, // when request's accept-encoding include gzip, files will compressed by gzip.
        //     usePrecompiledGzip: false, // try use gzip files, loaded from disk, like nginx gzip_static
        //     buffer: false, // store the files in memory instead of streaming from the filesystem on each request
        //     filter: [], // (function | array) - filter files at init dir, for example - skip non build (source) files. If array set - allow only listed files
        //     maxAge: 3600 * 24 * 7, // cache control max age for the files, 0 by default.
        //     preload: false, // caches the assets on initialization or not, default to true. always work together with options.dynamic.
        //     cache: false // dynamic load file which not cached on initialization.
        // },
        "StaticMiddleware": false,
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