/*
 * @Author: richen
 * @Date: 2020-07-16 14:13:32
 * @LastEditTime: 2020-12-15 10:10:37
 * @Description:
 * @Copyright (c) - <richenlin(at)gmail.com>
 */

import { IPlugin, Plugin, Logger } from '../../../src';
import { App } from '../App';

@Plugin()
export class TestPlugin implements IPlugin {

    run(options: any, app: App) {
        Logger.Info("TestPlugin run...");

        app.test = "TestPlugin---111111";
        return Promise.resolve();
    }
}