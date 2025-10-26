/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-11-08 15:12:06
 * @LastEditTime: 2023-11-08 15:15:06
 */
import { BindEventHook, Logger, KoattyApplication, AppEvent } from "../../../../src";

export function TestBootStrap(): ClassDecorator {
  return (target: any) => {
    BindEventHook(AppEvent.appBoot, (app: KoattyApplication) => {
      // todo
      Logger.Debug("TestBootStrap");
      return Promise.resolve();
    }, target)
  }
}

