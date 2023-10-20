/*
 * @Description: 数据传输处理层
 * @Usage: 新增用户数据处理
 * @Author: xxx
 * @Date: 2020-12-22 16:10:51
 * @LastEditTime: 2022-03-15 14:24:31
 */
import { Component } from "../../../src/index";
import { IsNotEmpty } from "koatty_validation";

@Component()
export class UserDto {
  @IsNotEmpty({ message: "手机号码不能为空" })
  phoneNum: string;
}
