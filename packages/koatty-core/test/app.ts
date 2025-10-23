import { Koatty, KoattyContext, KoattyMetadata, KoattyRouter, KoattyServer } from '../src/index';


export class App extends Koatty {
  ctx: KoattyContext


  mataData: KoattyMetadata;

  constructor() {
    super();
    this.init();
  }

  public init(): void {
    this.setMetaData("aa", "bb");
    
    // 添加默认的响应处理中间件
    this.use(async (ctx: any, next: any) => {
      try {
        await next();
      } catch (err) {
        // 如果没有其他中间件处理，确保有响应
        if (!ctx.respond && !ctx.body) {
          ctx.status = 404;
          ctx.body = 'Not Found';
        }
        throw err;
      }
      
      // 确保响应被发送
      if (ctx.body === undefined && ctx.status === 404) {
        ctx.body = 'Not Found';
      }
    });
    
    return;
  }
}


