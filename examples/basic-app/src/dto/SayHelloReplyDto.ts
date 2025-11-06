/*
 * @Description: 数据传输处理层
 * @Usage: 
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2022-03-15 14:24:21
 */

import { Component } from "../../../../src/index";
import { IsNotEmpty, IsDefined } from "koatty_validation";

@Component()
export class SayHelloReplyDto {
  // @IsNotEmpty()
  // name: string;

  /**
   * 如果未添加其他规则,属性必须具备@IsDefined()装饰器
   * 否则DTO实例参数自动赋值会失效
   */
  // @IsDefined() 
  // memo: string;

  @IsDefined()
  message: string;
}