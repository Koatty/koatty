/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-20 07:25:29
 */
import { Locker, RedisOptions } from "../util/Locker";
import * as helper from "think_lib";
import logger from "think_logger";
import { IOCContainer } from './Container';


/**
 * Decorate this method to support caching.
 * The cache method returns a value to ensure that the next time the method is executed with the same parameters, 
 * the results can be obtained directly from the cache without the need to execute the method again.
 *
 * @export
 * @param {string} cacheName cache name
 * @param {(number | number[])} [paramKey] The index of the arguments.
 * @param {RedisOptions} [redisOptions] Reids server config. Read from db.ts by default.
 * @returns {MethodDecorator}
 */
export function Cacheable(cacheName: string, paramKey?: number | number[], redisOptions?: RedisOptions): MethodDecorator {
    return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
        const type = IOCContainer.getType(target);
        if (type === "CONTROLLER") {
            throw Error("Cacheable decorator cannot be used in the controller class.");
        }
        const { value, configurable, enumerable } = descriptor;
        descriptor = {
            configurable,
            enumerable,
            writable: true,
            async value(...props: any[]) {
                let cacheFlag = true;
                if (helper.isEmpty(redisOptions)) {
                    // tslint:disable-next-line: no-invalid-this
                    redisOptions = this.app.config("Cacheable", "db") || this.app.config("redis", "db");
                    if (helper.isEmpty(redisOptions)) {
                        cacheFlag = false;
                        logger.error("Missing redis server configuration. Please write a configuration item with the key name 'Cacheable' or 'redis' in the db.ts file.");
                    }
                }
                // tslint:disable-next-line: one-variable-per-declaration
                let lockerCls, client, isError = false;
                if (cacheFlag) {
                    lockerCls = Locker.getInstance(redisOptions);
                    if (!lockerCls) {
                        cacheFlag = false;
                        isError = true;
                        // logger.error(`Redis connection failed. @Cacheable is not executed.`);
                    } else {
                        client = await lockerCls.defineCommand().catch((err: any) => {
                            cacheFlag = false;
                            isError = true;
                            // logger.error(`Redis connection error. @Cacheable is not executed.`);
                        });
                        if (!client || !helper.isFunction(client.hget)) {
                            cacheFlag = false;
                            isError = true;
                            // logger.error(`Redis connection error. @Cacheable is not executed.`);
                        }
                    }
                }
                if (isError) {
                    logger.error(`Redis connection failed. @Cacheable is not executed.`);
                }

                if (cacheFlag) {
                    // tslint:disable-next-line: one-variable-per-declaration
                    let key = "", res;
                    if (helper.isArray(paramKey)) {
                        (<number[]>paramKey).map((it: any) => {
                            if (!helper.isTrueEmpty(props[it])) {
                                if (typeof props[it] === "object") {
                                    key = `${key}${helper.md5(JSON.stringify(props[it]))}`;
                                } else {
                                    key = `${key}${props[it]}`;
                                }
                            }
                        });
                    } else {
                        if (typeof props[(<number>paramKey)] === "object") {
                            key = helper.md5(JSON.stringify(props[(<number>paramKey)]));
                        } else {
                            key = props[(<number>paramKey)] || "";
                        }
                    }
                    if (!helper.isTrueEmpty(key)) {
                        res = await client.hget(`${cacheName}_HASH`, key).catch((): any => null);
                    } else {
                        res = await client.get(cacheName).catch((): any => null);
                    }
                    res = JSON.parse(res || "[]");

                    if (helper.isEmpty(res)) {
                        // tslint:disable-next-line: no-invalid-this
                        res = await value.apply(this, props);
                        if (!helper.isEmpty(res)) {
                            if (!helper.isTrueEmpty(key)) {
                                client.hset(`${cacheName}_HASH`, key, JSON.stringify(res)).catch((): any => null);
                            } else {
                                client.set(cacheName, JSON.stringify(res)).catch((): any => null);
                            }
                        }
                    }
                    return res;
                } else {
                    // tslint:disable-next-line: no-invalid-this
                    return value.apply(this, props);
                }
            }
        };
        return descriptor;
    };
}

/**
 * 
 */
export type eventTimes = "Before" | "After";

/**
 * Decorating the execution of this method will trigger a cache clear operation.
 *
 * @export
 * @param {string} cacheName cacheName cache name
 * @param {(number | number[])} [paramKey] The index of the arguments.
 * @param {eventTimes} [eventTime="Before"]
 * @param {RedisOptions} [redisOptions] Reids server config. Read from db.ts by default.
 * @returns
 */
export function CacheEvict(cacheName: string, paramKey?: number | number[], eventTime: eventTimes = "Before", redisOptions?: RedisOptions) {
    return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
        const type = IOCContainer.getType(target);
        if (type === "CONTROLLER") {
            throw Error("CacheEvict decorator cannot be used in the controller class.");
        }
        const { value, configurable, enumerable } = descriptor;
        descriptor = {
            configurable,
            enumerable,
            writable: true,
            async value(...props: any[]) {
                let cacheFlag = true;
                if (helper.isEmpty(redisOptions)) {
                    // tslint:disable-next-line: no-invalid-this
                    redisOptions = this.app.config("Cacheable", "db") || this.app.config("redis", "db");
                    if (helper.isEmpty(redisOptions)) {
                        cacheFlag = false;
                        logger.error("Missing redis server configuration. Please write a configuration item with the key name 'Cacheable' or 'redis' in the db.ts file.");
                    }
                }
                // tslint:disable-next-line: one-variable-per-declaration
                let lockerCls, client, isError = false;
                if (cacheFlag) {
                    lockerCls = Locker.getInstance(redisOptions);
                    if (!lockerCls) {
                        cacheFlag = false;
                        isError = true;
                        // logger.error(`Redis connection failed. @Cacheable is not executed.`);
                    } else {
                        client = await lockerCls.defineCommand().catch((err: any) => {
                            cacheFlag = false;
                            isError = true;
                            // logger.error(`Redis connection error. @Cacheable is not executed.`);
                        });
                        if (!client || !helper.isFunction(client.hget)) {
                            cacheFlag = false;
                            isError = true;
                            // logger.error(`Redis connection error. @Cacheable is not executed.`);
                        }
                    }
                }
                if (isError) {
                    logger.error(`Redis connection failed. @Cacheable is not executed.`);
                }

                if (cacheFlag) {
                    let key = "";
                    if (helper.isArray(paramKey)) {
                        (<number[]>paramKey).map((it: any) => {
                            if (!helper.isTrueEmpty(props[it])) {
                                if (typeof props[it] === "object") {
                                    key = `${key}${helper.md5(JSON.stringify(props[it]))}`;
                                } else {
                                    key = `${key}${props[it]}`;
                                }
                            }
                        });
                    } else {
                        if (typeof props[(<number>paramKey)] === "object") {
                            key = helper.md5(JSON.stringify(props[(<number>paramKey)]));
                        } else {
                            key = props[(<number>paramKey)] || "";
                        }
                    }
                    if (eventTime === "Before") {
                        if (!helper.isTrueEmpty(key)) {
                            await client.hdel(`${cacheName}_HASH`, key).catch((): any => null);
                        } else {
                            await client.del(cacheName).catch((): any => null);
                        }
                        // tslint:disable-next-line: no-invalid-this
                        return value.apply(this, props);
                    } else {
                        // tslint:disable-next-line: no-invalid-this
                        const res = await value.apply(this, props);
                        if (!helper.isTrueEmpty(key)) {
                            await client.hdel(`${cacheName}_HASH`, key).catch((): any => null);
                        } else {
                            await client.del(cacheName).catch((): any => null);
                        }
                        return res;
                    }
                } else {
                    // tslint:disable-next-line: no-invalid-this
                    return value.apply(this, props);
                }
            }
        };
        return descriptor;
    };
}