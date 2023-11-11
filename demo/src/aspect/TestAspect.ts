/*
 * @Description: AOP切面类
 * @Usage: 
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2023-11-11 11:17:08
 */

import { Aspect, IAspect, Logger } from "../../../src/index";
import { App } from '../App';

@Aspect()
export class TestAspect implements IAspect {
  app: App;

  run(name: string) {
    Logger.Debug(name);
    return Promise.resolve();
  }
}