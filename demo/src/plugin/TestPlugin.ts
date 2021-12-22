/*
 * @Description: 插件扩展
 * @Usage: Test插件实现
 * @Author: xxx
 * @Date: 2020-12-22 16:00:49
 * @LastEditTime: 2021-12-23 01:00:20
 */

import { Plugin, IPlugin, Logger } from '../../../src/index';
import { App } from '../App';
// import { TestPlugin } from 'xxx';

@Plugin()
export class TestPlugin implements IPlugin {
    run(options: any, app: App) {
        // return TestPlugin(options, app);
        // or
        // todo something
        Logger.Debug("TestPlugin");
        return Promise.resolve();
    }
}
