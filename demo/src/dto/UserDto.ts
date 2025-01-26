/*
 * @Description: 数据传输处理层
 * @Usage: 新增用户数据处理
 * @Author: xxx
 * @Date: 2020-12-22 16:10:51
 * @LastEditTime: 2025-01-17 14:00:40
 */
import { IsNotEmpty } from "koatty_validation";
import { Component } from "../../../src/index";
import { Definition } from "../middleware/Swagger";

@Component()
@Definition()
export class UserDto {
  @IsNotEmpty({ message: "手机号码不能为空" })
  phoneNum: string;
}
