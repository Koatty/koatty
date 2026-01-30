/*
 * @Description: 插件扩展
 * @Usage: Test插件实现
 * @Author: xxx
 * @Date: 2020-12-22 16:00:49
 * @LastEditTime: 2026-01-30 10:23:00
 */

import { Component, IPlugin, Logger, KoattyApplication } from '../../../../src/index';
// import { TestPlugin } from 'xxx';

@Component("TestPlugin", { scope: 'core', priority: 50 })
export class TestPlugin implements IPlugin {
  run(options: object, app: KoattyApplication) {
    // return TestPlugin(options, app);
    // or
    // todo something
    Logger.Debug("TestPlugin");
    return Promise.resolve();
  }
}
