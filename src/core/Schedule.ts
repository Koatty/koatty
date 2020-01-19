/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-01-19 10:40:54
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

interface ScheduleLocker {

    /**
     * Enable redis-based distributed locks.
     *
     * @type {boolean}
     * @memberof ScheduleLocker
     */
    enableLocker: boolean;

    /**
     * Redis server connection configs.
     *
     * @type {{
     *         key_prefix: '';
     *         redis_host: '127.0.0.1';
     *         redis_port: 6379;
     *         redis_password: '';
     *         redis_db: '0'
     *     }}
     * @memberof ScheduleLocker
     */
    redisOptions: {
        key_prefix?: string;
        redis_host: string;
        redis_port?: number;
        redis_password?: string;
        redis_db?: string
    };

    /**
     * Automatic release of lock within a limited maximum time.
     *
     * @type {number}
     * @memberof ScheduleLocker
     */
    lockTimeOut?: number;

    /**
     * Try to acquire lock every interval time(millisecond).
     *
     * @type {number}
     * @memberof ScheduleLocker
     */
    waitLockInterval?: number;

    /**
     * When using more than TimeOut(millisecond) still fails to get the lock and return failure.
     *
     * @type {number}
     * @memberof ScheduleLocker
     */
    waitLockTimeOut?: number;
}


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
 * @param {false} enableLocker Enable redis-based distributed locks.
 * @param {number} [lockTimeOut] Automatic release of lock within a limited maximum time.
 * @param {number} [waitLockInterval] Try to acquire lock every interval time(millisecond).
 * @param {number} [waitLockTimeOut] When using more than TimeOut(millisecond) still fails to get the lock and return failure.
 * @returns {MethodDecorator}
 */
export function Scheduled(cron: string, enableLocker: boolean, lockTimeOut?: number, waitLockInterval?: number, waitLockTimeOut?: number): MethodDecorator {
    if (helper.isEmpty(cron)) {
        // cron = "* */1 * * * *";
        throw Error("ScheduleJob rule is not defined");
    }
    return (target, propertyKey: string, descriptor: PropertyDescriptor) => {
        attachPropertyData(SCHEDULE_KEY, {
            cron,
            method: propertyKey,
            locker: {
                enableLocker,
                lockTimeOut,
                waitLockInterval,
                waitLockTimeOut
            }
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
 * @param {*} lockerOption
 * @param {*} redisOptions
 */
const execInject = function (target: any, container: Container, method: string, cron: string, lockerOption: any, redisOptions: any) {
    // tslint:disable-next-line: no-unused-expression
    container.app.once && container.app.once("appStart", () => {
        const identifier = getIdentifier(target);
        const type = getType(target);
        const instance: any = container.get(identifier, type);
        let lockerCls: any;
        if (lockerOption && lockerOption.enableLocker) {
            lockerCls = Locker.getInstance(redisOptions);
        }
        if (instance && helper.isFunction(instance[method]) && cron) {
            // tslint:disable-next-line: no-unused-expression
            process.env.NODE_ENV === "development" && logger.custom("think", "", `Register inject ${identifier} schedule key: ${method} => value: ${cron}`);
            new CronJob(cron, async function () {
                let lockerFlag = false;
                const key = `${identifier}_${method}`;
                if (lockerCls) {
                    const locker = await lockerCls.defineCommand();
                    if (lockerOption.waitLockInterval || lockerOption.waitLockTimeOut) {
                        lockerFlag = await lockerCls.waitLock(key,
                            lockerOption.lockTimeOut,
                            lockerOption.waitLockInterval,
                            lockerOption.waitLockTimeOut
                        );
                    } else {
                        lockerFlag = await lockerCls.lock(key, lockerOption.lockTimeOut);
                    }
                } else {
                    lockerFlag = true;
                }
                if (lockerFlag) {
                    logger.info(`The schedule job ${key} started.`);
                    try {
                        const res = await instance[method]();
                        return res;
                    } catch (e) {
                        logger.error(e);
                    } finally {
                        if (lockerCls) {
                            await lockerCls.unLock(key);
                        }
                    }
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
    const redisOptions = container.app.config("Scheduled", "db") || container.app.config("redis", "db");
    if (helper.isEmpty(redisOptions)) {
        throw Error("Missing redis server configuration");
    }
    // tslint:disable-next-line: forin
    for (const meta in metaDatas) {
        for (const val of metaDatas[meta]) {
            if (val.cron && meta) {
                execInject(target, container, meta, val.cron, val.locker, redisOptions);
            }
        }
    }
}

