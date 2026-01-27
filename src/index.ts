/*
 * @Description: framework main file
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2025-01-14 16:12:41
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

export { Config } from "koatty_config";
export * from "koatty_container";
export * from "koatty_core";
export * from "koatty_exception";
export { Helper } from "koatty_lib";
export * from "koatty_router";
export * from "./core/Bootstrap";
export { Logger } from "./util/Logger";

function autoRegisterCorePlugins() {
  try {
    require('koatty_router/dist/RouterPlugin');
  } catch (e) {
  }

  try {
    require('koatty_serve/dist/ServePlugin');
  } catch (e) {
  }

  try {
    require('koatty_trace/dist/TracePlugin');
  } catch (e) {
  }
}

autoRegisterCorePlugins();


