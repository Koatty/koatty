/*
 * @Description:
 * @Usage:
 * @Author: richen
 * @Date: 2021-11-09 15:30:39
 * @LastEditTime: 2021-11-09 16:05:53
 */

import { Koatty, Logger } from "../../src";
import { BindAppReadyHook } from "../../src/core/Bootstrap";

export function TestBootstrap(): ClassDecorator {
    return (target: any) => {
        BindAppReadyHook((app: Koatty) => {
            // todo
            Logger.Debug("TestDecorator");
            return Promise.resolve();
        }, target)
    }
}