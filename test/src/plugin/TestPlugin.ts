/*
 * @Author: richen
 * @Date: 2020-07-16 14:13:32
 * @LastEditTime: 2020-07-16 14:45:19
 * @Description:
 * @Copyright (c) - <richenlin(at)gmail.com>
 */

import { IPlugin, Plugin } from '../../../src';
import logger from 'think_logger';
import { App } from '../App';

@Plugin()
export class TestPlugin implements IPlugin {

    run(options: any, app: App) {
        logger.info("TestPlugin run...");

        app.test = "plugin---111111";
        return Promise.resolve();
    }
}