"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPONENTS = new Set();
exports.IOC = new WeakMap();
exports.COMPONENT = '@@COMPONENT';
exports.COMPONENT_REG = new RegExp(`^${exports.COMPONENT}`);
exports.CONTROLLER = '@@CONTROLLER';
exports.CONTROLLER_REG = new RegExp(`^${exports.CONTROLLER}`);
exports.RESTCONTROLLER = '@@RESTCONTROLLER';
exports.RESTCONTROLLER_REG = new RegExp(`^${exports.RESTCONTROLLER}`);
exports.SERVICE = '@@SERVICE';
exports.SERVICE_REG = new RegExp(`^${exports.SERVICE}`);
exports.MODEL = '@@MODEL';
exports.MODEL_REG = new RegExp(`^${exports.MODEL}`);
exports.AUTOWIRED = '@@AUTOWIRED';
exports.AUTOWIRED_REG = new RegExp(`^${exports.AUTOWIRED}@@`);
exports.MIDDLEWARE = '@@MIDDLEWARE';
exports.MIDDLEWARE_REG = new RegExp(`^${exports.MIDDLEWARE}`);
exports.CLASS_KEY_CONSTRUCTOR = 'koatty:class_key_constructor';
exports.FUNCTION_INJECT_KEY = 'koatty:function_inject_key';
exports.COMPONENT_KEY = 'component';
exports.CONTROLLER_KEY = 'controller';
exports.PRIORITY_KEY = 'priority';
exports.CONFIG_KEY = 'config';
exports.LOGGER_KEY = 'logger';
//# sourceMappingURL=Constants.js.map