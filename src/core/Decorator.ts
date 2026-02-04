/**
 * Decorator for Koatty framework
 * @author richen
 * @copyright Copyright (c) - <richenlin(at)gmail.com>
 * @license BSD (3-Clause)
 * @version 2026-02-03 10:00:00
 */

import { IOC, TAGGED_CLS } from "koatty_container";
import { Koatty } from "koatty_core";
import { ExecBootStrap } from "./Bootstrap";
import { COMPONENT_SCAN, CONFIGURATION_SCAN } from "./Constants";

/**
 * Bootstrap decorator for Koatty application class.
 * 
 * @param bootFunc Optional function to execute during bootstrap process
 * @returns ClassDecorator
 * @throws Error if target class does not inherit from Koatty
 * 
 * @example
 * ```ts
 * @Bootstrap()
 * export class App extends Koatty {
 *   // ...
 * }
 * ```
 */
export function Bootstrap(bootFunc?: (...args: any[]) => any): ClassDecorator {
  return function (target: any) {
    if (!(target.prototype instanceof Koatty)) {
      throw new Error(`class does not inherit from Koatty`);
    }
    IOC.saveClass('COMPONENT', target, 'KOATTY_APP');
    ExecBootStrap(bootFunc)(target);
    return target;
  };
}

/**
 * Component scan decorator for Koatty application.
 * Scans the specified path(s) for components and registers them in the IOC container.
 * 
 * @param {string | string[]} [scanPath] - The path or array of paths to scan for components
 * @returns {ClassDecorator} A class decorator that enables component scanning
 * @throws {Error} If the decorated class does not inherit from Koatty
 * @example
 * ```typescript
 * @ComponentScan()
 * export class App extends Koatty {
 *   // ...
 * }
 * ```
 */
export function ComponentScan(scanPath?: string | string[]): ClassDecorator {
  return (target: any) => {
    if (!(target.prototype instanceof Koatty)) {
      throw new Error(`class does not inherit from Koatty`);
    }
    scanPath = scanPath ?? '';
    IOC.saveClassMetadata(TAGGED_CLS, COMPONENT_SCAN, scanPath, target);
  };
}


/**
 * Configuration scan decorator, used to scan and load configuration files.
 * 
 * @param scanPath - The path or array of paths to scan for configuration files. If not provided, defaults to empty string.
 * @returns A class decorator function that registers configuration scan metadata.
 * @throws Error if the decorated class does not inherit from Koatty.
 * @example
 * ```typescript
 * @ConfigurationScan()
 * export class App extends Koatty {
 *   // ...
 * }
 */
export function ConfigurationScan(scanPath?: string | string[]): ClassDecorator {
  return (target: any) => {
    if (!(target.prototype instanceof Koatty)) {
      throw new Error(`class does not inherit from Koatty`);
    }
    scanPath = scanPath ?? '';
    IOC.saveClassMetadata(TAGGED_CLS, CONFIGURATION_SCAN, scanPath, target);
  };
}
