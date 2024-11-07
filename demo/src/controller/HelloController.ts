/*
 * @Description: 业务层
 * @Usage: 接收处理路由参数
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2024-11-07 16:52:05
 */

import { Validated } from 'koatty_validation';
import {
  ComponentType,
  Controller,
  KoattyContext,
  RequestBody,
  RequestMapping,
} from '../../../src/index';
import { App } from '../App';
import { SayHelloReplyDto } from '../dto/SayHelloReplyDto';
import { SayHelloRequestDto } from '../dto/SayHelloRequestDto';

@Controller('/Hello') // Consistent with proto.service name
export class HelloController {
  app: App;
  ctx: KoattyContext;

  comType: ComponentType;

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
    throw new Error("xxxx");

    return Promise.resolve(res);
  }

}