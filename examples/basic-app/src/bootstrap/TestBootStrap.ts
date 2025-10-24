/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-11-08 15:12:06
 * @LastEditTime: 2023-11-08 15:15:06
 */
import { Koatty, BindEventHook, AppEvent, Logger } from "../../../src/index";

export function TestBootStrap(): ClassDecorator {
  return (target: any) => {
    BindEventHook(AppEvent.appBoot, (app: Koatty) => {
      // todo
      Logger.Debug("TestBootStrap");
      return Promise.resolve();
    }, target)
  }
}

