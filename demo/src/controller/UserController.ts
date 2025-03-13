/*
 * @Description: 业务层
 * @Usage: 接收处理路由参数
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2025-03-13 11:31:47
 */

import { Validated } from "koatty_validation";
import {
  Controller,
  Get,
  KoattyContext,
  Post
} from '../../../src/index';
import { App } from "../App";
import { UserDto } from "../dto/UserDto";

import { UserInputDto } from "../dto/UserInputDto";

@Controller('/graphql') // Consistent with graphql name
export class UserController {
  app: App;
  ctx: KoattyContext;

  /**
   * constructor
   *
   */
  constructor(ctx: KoattyContext) {
    this.ctx = ctx;
  }

  async getUser(@Get() id: string): Promise<UserDto> {
    const result = new UserDto();
    // TODO: Implement business logic here
    return Promise.resolve(result);
  }

  @Validated()
  async createUser(@Post() input: UserInputDto): Promise<UserDto> {
    const result = new UserDto();
    // TODO: Implement business logic here
    return Promise.resolve(result);
  }
}
