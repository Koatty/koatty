/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:17:26
 */
// import { ui } from 'swagger2-koa';
import { koaSwagger } from 'koa2-swagger-ui';
import { IMiddleware, Middleware } from '../../../src/index';
import { App } from '../App';
import { swaggerDoc } from './Swagger';

import * as spec from "../resource/data1.json";

@Middleware()
export class SwaggerMiddleware implements IMiddleware {
  run(options: any, app: App) {
    let swaggerSpec: any = swaggerDoc({
      info: {
        title: `Test API`,
        version: '1.0.0',
        description: `Test API`
      },
    });

    console.log(JSON.stringify(swaggerSpec));

    return koaSwagger({ routePrefix: false, swaggerOptions: { spec } });
    //   return function (ctx: KoattyContext, next: KoattyNext) {
    //     return next();
    //   }
  }
}