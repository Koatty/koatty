/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-27 20:15:30
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import logger from 'think_logger';
import { Container } from './Container';
import { SCHEDULE_KEY } from './Constants';
import { scheduleJob } from 'node-schedule';
import { recursiveGetMetadata } from '../util/Lib';
import { attachPropertyData, getIdentifier } from './Injectable';

/**
 * Schedule task
 * 
 *  * * * * * *
 *  ┬ ┬ ┬ ┬ ┬ ┬
 *  │ │ │ │ │ |
 *  │ │ │ │ │ └ day of week (0 - 7) (0 or 7 is Sun)
 *  │ │ │ │ └───── month (1 - 12)
 *  │ │ │ └────────── day of month (1 - 31)
 *  │ │ └─────────────── hour (0 - 23)
 *  │ └──────────────────── minute (0 - 59)
 *  └───────────────────────── second (0 - 59, OPTIONAL)
 * @export
 * @param {string} 
 * @returns {MethodDecorator}
 */
export function Scheduled(cron: string): MethodDecorator {
    if (helper.isEmpty(cron)) {
        // cron = "* */1 * * * *";
        throw Error("ScheduleJob rule is not defined");
    }
    return (target, propertyKey: string, descriptor: PropertyDescriptor) => {
        attachPropertyData(SCHEDULE_KEY, {
            cron,
            method: propertyKey
        }, target, propertyKey);
    };
}

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} instance
 * @param {Container} container
 */
export function injectSchedule(target: any, instance: any, container: Container) {
    const metaDatas = recursiveGetMetadata(SCHEDULE_KEY, target);
    // tslint:disable-next-line: forin
    for (const meta in metaDatas) {
        for (const val of metaDatas[meta]) {
            if (val.cron && helper.isFunction(instance[meta])) {
                // tslint:disable-next-line: no-unused-expression
                process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject ${getIdentifier(target)} schedule key: ${helper.toString(meta)} => value: ${JSON.stringify(metaDatas[meta])}`);
                scheduleJob(val.cron, async function () {
                    try {
                        const res = await instance[meta]();
                        return res;
                    } catch (e) {
                        logger.error(e);
                    }
                });
            }
        }
    }
}
