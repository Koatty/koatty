/*
 * @Description: AOP切面类
 * @Usage: 
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2023-12-05 11:04:39
 */

import { Aspect, Autowired, IAspect, Logger } from "../../../src/index";
import { App } from '../App';
import { SayHelloRequestDto } from "../dto/SayHelloRequestDto";

@Aspect()
export class TestAspect implements IAspect {
  app: App;
  @Autowired()
  sayHelloRequestDto: SayHelloRequestDto;

  run(name: string) {
    Logger.Debug(name);
    return Promise.resolve();
  }
}