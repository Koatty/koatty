/*
 * @Description: plugin config
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2023-12-09 22:17:13
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */


export default {
  // List of loaded plugins, executed in the order of elements
  list: [],
  config: {
    RouterPlugin: {
      enabled: true,
    },
    ServePlugin: {
      enabled: true,
    },
    TracePlugin: {
      enabled: true,
    },
  }
};