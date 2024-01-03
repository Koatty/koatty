/*
 * @Description: 业务层
 * @Usage: 接收处理路由参数
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2024-01-03 22:02:09
 */

import { KoattyContext, Controller, BaseController, Autowired, RequestMapping, RequestBody } from '../../../src/index';
import { App } from '../App';
import { SayHelloRequestDto } from '../dto/SayHelloRequestDto';
import { SayHelloReplyDto } from '../dto/SayHelloReplyDto';
import { Validated } from 'koatty_validation';

@Controller('/Hello') // Consistent with proto.service name
export class HelloController {
  app: App;
  ctx: KoattyContext;

  /**
   * constructor
   *
   */
  constructor(ctx: KoattyContext) {
    this.ctx = ctx;
  }


  /**
   * SayHello 接口
   *
   * @param {SayHelloRequestDto} data
   * @returns
   */
  @RequestMapping('/SayHello') // Consistent with proto.service.method name
  @Validated()
  SayHello(@RequestBody() params: SayHelloRequestDto): Promise<SayHelloReplyDto> {
    const res = new SayHelloReplyDto();
    res.message = params.name;
    return Promise.resolve(res);
  }

}