/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-02-27 16:03:27
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import * as helper from "think_lib";
import logger from "think_logger";
import { Container } from "./Container";
import { SCHEDULE_KEY } from "./Constants";
import { CronJob } from "cron";
import { Locker } from "../util/Locker";
import { recursiveGetMetadata } from "../util/Lib";
import { attachPropertyData, getIdentifier, getType } from "./Injectable";
import { Helper, Logger } from '..';

/**
 * Schedule task
 *
 * @export
 * @param {string} cron
 * * Seconds: 0-59
 * * Minutes: 0-59
 * * Hours: 0-23
 * * Day of Month: 1-31
 * * Months: 0-11 (Jan-Dec)
 * * Day of Week: 0-6 (Sun-Sat)
 * @param {*} [redisOptions] Reids server config.
 * @returns {MethodDecorator}
 */
export function Scheduled(cron: string): MethodDecorator {
    if (helper.isEmpty(cron)) {
        // cron = "0 * * * * *";
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
 * Schedule redis-based distributed locks
 *
 * @export
 * @param {string} [name] The locker name. If name is duplicated, lock sharing contention will result.
 * @param {number} [lockTimeOut] Automatic release of lock within a limited maximum time.
 * @param {number} [waitLockInterval] Try to acquire lock every interval time(millisecond).
 * @param {number} [waitLockTimeOut] When using more than TimeOut(millisecond) still fails to get the lock and return failure.
 * @param {*} [redisOptions] Reids server config.
 * @returns {MethodDecorator}
 */
export function SchedulerLock(name?: string, lockTimeOut?: number, waitLockInterval?: number, waitLockTimeOut?: number, redisOptions?: any): MethodDecorator {
    return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
        const { value, configurable, enumerable } = descriptor;
        if (Helper.isEmpty(name)) {
            const identifier = getIdentifier(target) || (target.constructor ? target.constructor.name : "");
            name = `${identifier}_${methodName}`;
        }
        descriptor = {
            configurable,
            enumerable,
            writable: true,
            value: async function before(...props: any[]) {
                if (Helper.isEmpty(redisOptions)) {
                    // tslint:disable-next-line: no-invalid-this
                    redisOptions = this.app.config("Scheduled", "db") || this.app.config("redis", "db");
                    if (helper.isEmpty(redisOptions)) {
                        throw Error("Missing redis server configuration. Please write a configuration item with the key name Scheduled or redis in the db.ts file.");
                    }
                }
                const lockerCls = Locker.getInstance(redisOptions);
                let lockerFlag = false;
                if (lockerCls) {
                    const locker = await lockerCls.defineCommand();
                    if (waitLockInterval || waitLockTimeOut) {
                        lockerFlag = await lockerCls.waitLock(name,
                            lockTimeOut,
                            waitLockInterval,
                            waitLockTimeOut
                        );
                    } else {
                        lockerFlag = await lockerCls.lock(name, lockTimeOut);
                    }
                } else {
                    return Promise.reject(`Redis connection failed. The method ${methodName} is not executed.`);
                }
                if (lockerFlag) {
                    try {
                        logger.info(`The locker ${name} executed.`);
                        // tslint:disable-next-line: no-invalid-this
                        const res = await value.apply(this, props);
                        return res;
                    } catch (e) {
                        return Promise.reject(e);
                    } finally {
                        if (lockerCls.unLock) {
                            await lockerCls.unLock(name).catch((er: any) => {
                                Logger.error(er);
                            });
                        }
                    }
                } else {
                    return Promise.reject(`Redis lock ${name} acquisition failed. The method ${methodName} is not executed.`);
                }
            }
        };
        return descriptor;
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
const execInjectSchedule = function (target: any, container: Container, method: string, cron: string) {
    // tslint:disable-next-line: no-unused-expression
    container.app.once && container.app.once("appStart", () => {
        const identifier = getIdentifier(target);
        const type = getType(target);
        const instance: any = container.get(identifier, type);
        const name = `${identifier}_${method}`;

        if (instance && helper.isFunction(instance[method]) && cron) {
            // tslint:disable-next-line: no-unused-expression
            process.env.APP_DEBUG && logger.custom("think", "", `Register inject ${identifier} schedule key: ${method} => value: ${cron}`);
            new CronJob(cron, async function () {

                logger.info(`The schedule job ${name} started.`);
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
                execInjectSchedule(target, container, meta, val.cron);
            }
        }
    }
}
