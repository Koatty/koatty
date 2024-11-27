/*
 * @Description: 入口文件
 * @Usage: 实例化app，创建服务
 * @Author: richen
 * @Date: 2020-12-22 15:35:07
 * @LastEditTime: 2024-11-20 10:01:14
 */

import * as path from 'path';
import { Bootstrap, Koatty } from "../../src/index";
import { TestBootStrap } from "./bootstrap/TestBootStrap";

// bootstrap function
@Bootstrap(() => {
  // 调整libuv线程池大小
  process.env.UV_THREADPOOL_SIZE = '128';
  // 忽略https自签名验证
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
})
// 配置组件存放目录，默认: ./
// @ComponentScan('./')
// 配置配置文件存放目录，默认: ./config
// @ConfigurationScan('./config')
@TestBootStrap()
export class App extends Koatty {
  // 重写init方法，用于服务初始化前置
  public init() {
    // 服务运行目录
    this.rootPath = path.dirname(__dirname);
  }
}
