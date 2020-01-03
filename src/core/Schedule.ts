/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-01-03 19:58:41
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import * as helper from "think_lib";
import logger from "think_logger";
import { Container } from "./Container";
import { SCHEDULE_KEY } from "./Constants";
import { CronJob } from "cron";
import { recursiveGetMetadata } from "../util/Lib";
import { attachPropertyData, getIdentifier, getType } from "./Injectable";

/**
 * Schedule task
 * 
 * @param {string} cron
 * * Seconds: 0-59 
 * * Minutes: 0-59 
 * * Hours: 0-23 
 * * Day of Month: 1-31 
 * * Months: 0-11 (Jan-Dec) 
 * * Day of Week: 0-6 (Sun-Sat)
 * 
 *  https://github.com/kelektiv/node-cron/tree/master/examples
 * 
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
 * @param {*} target
 * @param {Container} container
 * @param {string} method
 * @param {string} cron
 */
const execInject = function (target: any, container: Container, method: string, cron: string) {
    // tslint:disable-next-line: no-unused-expression
    container.app.once && container.app.once("appStart", () => {
        const identifier = getIdentifier(target);
        const type = getType(target);
        const instance: any = container.get(identifier, type);
        if (instance && helper.isFunction(instance[method])) {
            // tslint:disable-next-line: no-unused-expression
            process.env.NODE_ENV === "development" && logger.custom("think", "", `Register inject ${identifier} schedule key: ${method} => value: ${cron}`);
            new CronJob(cron, async function () {
                try {
                    const res = await instance[method]();
                    return res;
                } catch (e) {
                    logger.error(e);
                }
            }).start();
        }
    });
};

/**
 * Inject schedule job
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
            if (val.cron && meta) {
                execInject(target, container, meta, val.cron);
            }
        }
    }
}

