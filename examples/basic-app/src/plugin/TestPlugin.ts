/*
 * @Description: 插件扩展
 * @Usage: Test插件实现
 * @Author: xxx
 * @Date: 2020-12-22 16:00:49
 * @LastEditTime: 2022-03-15 14:24:48
 */

import { Plugin, IPlugin, Logger, KoattyApplication } from '../../../../src/index';
// import { TestPlugin } from 'xxx';

@Plugin()
export class TestPlugin implements IPlugin {
  run(options: object, app: KoattyApplication) {
    // return TestPlugin(options, app);
    // or
    // todo something
    Logger.Debug("TestPlugin");
    return Promise.resolve();
  }
}
