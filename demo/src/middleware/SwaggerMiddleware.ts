/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:17:26
 */
// import { ui } from 'swagger2-koa';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IMiddleware, Middleware } from '../../../src/index';
import { App } from '../App';

@Middleware()
export class SwaggerMiddleware implements IMiddleware {
  run(options: any, app: App) {
    // let swaggerSpec: any = swaggerDoc({
    //   info: {
    //     title: `Test API`,
    //     version: '1.0.0',
    //     description: `Test API`
    //   },
    // });

    // console.log(JSON.stringify(swaggerSpec));

    const config = new DocumentBuilder()
      .setTitle('Cats example')
      .setDescription('The cats API description')
      .setVersion('1.0')
      .addTag('cats')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app as any, config);

    // return koaSwagger({ routePrefix: false, swaggerOptions: { spec: data } });
    //   return function (ctx: KoattyContext, next: KoattyNext) {
    //     return next();
    //   }
  }
}