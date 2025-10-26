/*
 * @Description: 业务层
 * @Usage: 接收处理路由参数
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2025-03-14 17:58:00
 */

import { Validated } from "koatty_validation";
import {
  Controller,
  Get,
  GetMapping,
  GraphQLController,
  KoattyContext,
  Post,
  PostMapping,
  RequestParam
} from '../../../../src/index';
import { App } from "../App";
import { UserDto } from "../dto/UserDto";

import { UserInputDto } from "../dto/UserInputDto";

@GraphQLController('/graphql') // Consistent with graphql name
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

  @GetMapping()
  async getUser(@RequestParam() id: string, @RequestParam() username: string): Promise<UserDto> {
    const result = new UserDto();
    result.id = id;
    result.username = username;
    result.email = "aa";
    result.createdAt = "aaa";
    result.phoneNum = "111";
    // TODO: Implement business logic here
    return result;
  }

  @PostMapping()
  @Validated()
  async createUser(@RequestParam() input: UserInputDto): Promise<UserDto> {
    const result = new UserDto();
    // TODO: Implement business logic here
    return Promise.resolve(result);
  }
}
