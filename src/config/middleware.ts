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
    "TraceMiddleware": {
      HeaderName: 'X-Request-Id',
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
    },
  }
};