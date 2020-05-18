/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-18 14:20:36
 */
import * as helper from "think_lib";
import logger from "think_logger";
const store = require("think_store");
import { IOCContainer } from './Container';


/**
 * Decorate this method to support caching. Reids server config from db.ts.
 * The cache method returns a value to ensure that the next time the method is executed with the same parameters,
 * the results can be obtained directly from the cache without the need to execute the method again.
 *
 * @export
 * @param {string} cacheName cache name
 * @param {(number | number[])} [paramKey] The index of the arguments.
 * @param {number} [timeout=3600] cache timeout
 * @returns {MethodDecorator}
 */
export function CacheAble(cacheName: string, paramKey?: number | number[], timeout = 3600): MethodDecorator {
    return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
        const type = IOCContainer.getType(target);
        if (type === "CONTROLLER") {
            throw Error("CacheAble decorator cannot be used in the controller class.");
        }
        let identifier = IOCContainer.getIdentifier(target);
        identifier = identifier || (target.constructor ? (target.constructor.name || "") : "");
        const { value, configurable, enumerable } = descriptor;
        descriptor = {
            configurable,
            enumerable,
            writable: true,
            async value(...props: any[]) {
                let cacheFlag = true;
                // tslint:disable-next-line: no-invalid-this
                const redisOptions = this.app.config("CacheAble", "db") || this.app.config("redis", "db");
                if (helper.isEmpty(redisOptions)) {
                    cacheFlag = false;
                    logger.error("Missing redis server configuration. Please write a configuration item with the key name 'CacheAble' or 'redis' in the db.ts file.");
                }

                // tslint:disable-next-line: one-variable-per-declaration
                let cacheStore;
                if (cacheFlag) {
                    cacheStore = store.getInstance(redisOptions);
                    if (!cacheStore || !helper.isFunction(cacheStore.get)) {
                        cacheFlag = false;
                        logger.error(`Redis connection failed. @CacheAble is not executed.`);
                    }
                }

                if (cacheFlag) {
                    // tslint:disable-next-line: one-variable-per-declaration
                    let key = "", res;
                    if (helper.isArray(paramKey)) {
                        (<number[]>paramKey).map((it: any) => {
                            if (!helper.isTrueEmpty(props[it])) {
                                if (typeof props[it] === "object") {
                                    key = `${key}${helper.murmurHash(JSON.stringify(props[it]))}`;
                                } else {
                                    key = `${key}${props[it] || ''}`;
                                }
                            }
                        });
                    } else if (helper.isNumber(paramKey)) {
                        if (typeof props[(<number>paramKey)] === "object") {
                            key = helper.murmurHash(JSON.stringify(props[(<number>paramKey)]));
                        } else {
                            key = props[(<number>paramKey)] || "";
                        }
                    } else {
                        key = `${identifier}:${methodName}`;
                    }

                    if (!helper.isTrueEmpty(key)) {
                        res = await cacheStore.get(`${cacheName}:${key}`).catch((): any => null);
                    } else {
                        res = await cacheStore.get(cacheName).catch((): any => null);
                    }
                    try {
                        res = JSON.parse(res || "");
                    } catch (e) {
                        res = null;
                    }

                    if (helper.isEmpty(res)) {
                        // tslint:disable-next-line: no-invalid-this
                        res = await value.apply(this, props);
                        // prevent cache penetration
                        if (helper.isEmpty(res)) {
                            res = "";
                            timeout = 60;
                        }
                        if (!helper.isTrueEmpty(key)) {
                            cacheStore.set(`${cacheName}:${key}`, JSON.stringify(res), timeout).catch((): any => null);
                        } else {
                            cacheStore.set(cacheName, JSON.stringify(res), timeout).catch((): any => null);
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
 * Decorate this method to support caching. Reids server config from db.ts.
 * The cache method returns a value to ensure that the next time the method is executed with the same parameters,
 * the results can be obtained directly from the cache without the need to execute the method again.
 *
 * @export
 * @param {string} cacheName cache name
 * @param {(number | number[])} [paramKey] The index of the arguments.
 * @param {number} [timeout=3600] cache timeout
 * @returns {MethodDecorator}
 */
export const Cacheable = CacheAble;

/**
 * 
 */
export type eventTimes = "Before" | "After";

/**
 * Decorating the execution of this method will trigger a cache clear operation. Reids server config from db.ts.
 *
 * @export
 * @param {string} cacheName cacheName cache name
 * @param {(number | number[])} [paramKey] The index of the arguments.
 * @param {eventTimes} [eventTime="Before"]
 * @returns
 */
export function CacheEvict(cacheName: string, paramKey?: number | number[], eventTime: eventTimes = "Before") {
    return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
        const type = IOCContainer.getType(target);
        if (type === "CONTROLLER") {
            throw Error("CacheEvict decorator cannot be used in the controller class.");
        }
        const identifier = IOCContainer.getIdentifier(target);
        const { value, configurable, enumerable } = descriptor;
        descriptor = {
            configurable,
            enumerable,
            writable: true,
            async value(...props: any[]) {
                let cacheFlag = true;
                // tslint:disable-next-line: no-invalid-this
                const redisOptions = this.app.config("CacheAble", "db") || this.app.config("redis", "db");
                if (helper.isEmpty(redisOptions)) {
                    cacheFlag = false;
                    logger.error("Missing redis server configuration. Please write a configuration item with the key name 'CacheAble' or 'redis' in the db.ts file.");
                }

                // tslint:disable-next-line: one-variable-per-declaration
                let cacheStore;
                if (cacheFlag) {
                    cacheStore = store.getInstance(redisOptions);
                    if (!cacheStore || !helper.isFunction(cacheStore.rm)) {
                        cacheFlag = false;
                        logger.error(`Redis connection failed. @CacheAble is not executed.`);
                    }
                }

                if (cacheFlag) {
                    let key = "";
                    if (helper.isArray(paramKey)) {
                        (<number[]>paramKey).map((it: any) => {
                            if (!helper.isTrueEmpty(props[it])) {
                                if (typeof props[it] === "object") {
                                    key = `${key}${helper.murmurHash(JSON.stringify(props[it]))}`;
                                } else {
                                    key = `${key}${props[it] || ''}`;
                                }
                            }
                        });
                    } else if (helper.isNumber(paramKey)) {
                        if (typeof props[(<number>paramKey)] === "object") {
                            key = helper.murmurHash(JSON.stringify(props[(<number>paramKey)]));
                        } else {
                            key = props[(<number>paramKey)] || "";
                        }
                    } else {
                        key = `${identifier}:${methodName}`;
                    }

                    if (eventTime === "Before") {
                        if (!helper.isTrueEmpty(key)) {
                            await cacheStore.rm(`${cacheName}:${key}`).catch((): any => null);
                        } else {
                            await cacheStore.rm(cacheName).catch((): any => null);
                        }
                        // tslint:disable-next-line: no-invalid-this
                        return value.apply(this, props);
                    } else {
                        // tslint:disable-next-line: no-invalid-this
                        const res = await value.apply(this, props);
                        if (!helper.isTrueEmpty(key)) {
                            await cacheStore.rm(`${cacheName}:${key}`).catch((): any => null);
                        } else {
                            await cacheStore.rm(cacheName).catch((): any => null);
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