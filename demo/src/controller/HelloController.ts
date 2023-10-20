/*
 * @Description: 业务层
 * @Usage: 接收处理路由参数
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2021-12-23 00:59:23
 */

import { KoattyContext, Controller, BaseController, Autowired, RequestMapping, RequestBody } from '../../../src/index';
import { App } from '../App';
import { SayHelloRequestDto } from '../dto/SayHelloRequestDto';
import { SayHelloReplyDto } from '../dto/SayHelloReplyDto';
import { Validated } from 'koatty_validation';

@Controller('/Hello') // Consistent with proto.service name
export class HelloController extends BaseController {
  app: App;
  ctx: KoattyContext;

  /**
   * Custom constructor
   *
   */
  init() {
    //todo
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