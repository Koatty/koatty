/*
 * @Description: router config
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2023-12-09 22:38:08
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

export default {
  // prefix: string;

  /**
   * Methods which should be supported by the router.
   */
  // methods?: string[];

  // routerPath?: string;

  /**
   * Whether or not routing should be case-sensitive.
   */
  // sensitive?: boolean;

  /**
   * Whether or not routes should matched strictly.
   *
   * If strict matching is enabled, the trailing slash is taken into
   * account when matching routes.
   */
  // strict?: boolean;

  /**
   * gRPC protocol file
   */
  // protoFile?: string;

  /**
   * payload options
   * 
   */
  // payload?: PayloadOptions;
  payload: {
    extTypes: {
      json: ['application/json'],
      form: ['application/x-www-form-urlencoded'],
      text: ['text/plain'],
      multipart: ['multipart/form-data'],
      xml: ['text/xml']
    },
    limit: '20mb',
    encoding: 'utf-8',
    multiples: true,
    keepExtensions: true,
  },

  /**
   *  Other extended configuration
   */
  // ext?: any;
};