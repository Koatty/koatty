/*
 * @Description: 业务层
 * @Usage: 接收处理路由参数
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2024-11-13 10:11:21
 */

import { Validated } from 'koatty_validation';
import {
  ComponentType,
  Controller,
  GrpcController,
  KoattyContext,
  PostMapping,
  RequestBody
} from '../../../src/index';
import { App } from '../App';
import { SayHelloReplyDto } from '../dto/SayHelloReplyDto';
import { SayHelloRequestDto } from '../dto/SayHelloRequestDto';

@GrpcController('/Hello') // Consistent with proto.service name
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
  // @Validated()  // gRPC 方法不需要 @PostMapping 装饰器
  SayHello(@RequestBody() params: SayHelloRequestDto): SayHelloReplyDto {
    const res = new SayHelloReplyDto();
    res.message = `Hello, ${params.name}! Your ID is ${params.id}`;
    return res;
  }

}