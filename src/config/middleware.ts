/*
 * @Description: middleware config
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2023-12-09 22:40:07
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

export default {
  // List of loaded middleware(except for the middleware loaded by default), 
  // executed in the order of elements
  list: [],
  // List of route-specific middleware, 
  // executed only for specified routes
  routeList: [],
  config: { // middleware configuration
    // TODO
  }
};
