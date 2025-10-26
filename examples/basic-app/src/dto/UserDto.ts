/*
 * @Description: 数据传输处理层
 * @Usage: 新增用户数据处理
 * @Author: xxx
 * @Date: 2020-12-22 16:10:51
 * @LastEditTime: 2025-03-13 11:19:04
 */
import { IsDefined, IsNotEmpty } from "koatty_validation";
import { Component } from "../../../../src/index";

@Component()
export class UserDto {
  @IsDefined()
  id: string;

  @IsDefined()
  username: string;

  @IsNotEmpty({ message: "手机号码不能为空" })
  phoneNum: string;

  @IsDefined()
  email: string;

  @IsDefined()
  createdAt: string;

}
