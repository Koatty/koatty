/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-27 19:00:17
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import logger from 'think_logger';
import { scheduleJob } from 'node-schedule';

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
        // attachPropertyData(SCHEDULE_KEY, {
        //     cron,
        //     method: propertyKey
        // }, target, propertyKey);
        const { value, configurable, enumerable } = descriptor;
        descriptor = {
            configurable,
            enumerable,
            writable: true,
            value: async function run(...props: any[]) {
                scheduleJob(cron, async function (props) {
                    try {
                        // tslint:disable-next-line: no-invalid-this
                        const res = await value.apply(this, props);
                        return res;
                    } catch (e) {
                        logger.error(e);
                    }
                });
                // tslint:disable-next-line: no-invalid-this
                return value.apply(this, props);
            }
        };
        return descriptor;
    };

}