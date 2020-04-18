/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-04-18 16:12:09
 */

export const COMPONENT_SCAN = 'COMPONENT_SCAN';
export const CONFIGUATION_SCAN = 'CONFIGUATION_SCAN';
export const PRIORITY_KEY = 'PRIORITY_KEY';

export const PARAM_KEY = 'PARAM_KEY';
export const PARAM_RULE_KEY = 'PARAM_RULE_KEY';
export const PARAM_CHECK_KEY = 'PARAM_CHECK_KEY';
export const NAMED_TAG = 'NAMED_TAG';
export const ROUTER_KEY = 'ROUTER_KEY';
export const SCHEDULE_KEY = 'SCHEDULE_KEY';

export type Scope = 'Singleton' | 'Prototype';
export type CompomentType = 'COMPONENT' | 'CONTROLLER' | 'MIDDLEWARE' | 'SERVICE';


// compoment scan bindings
export const INJECT_TAG = 'INJECT_TAG';

// used to store arguments tags
export const TAGGED_ARGS = 'INJECT_TAGGED_ARGS';

// used to store class properties tags
export const TAGGED_PROP = 'INJECT_TAGGED_PROP';

// used to store class method to be injected
export const TAGGED_METHOD = 'INJECT_TAGGED_METHOD';

// used to store class to be injected
export const TAGGED_CLS = 'INJECT_TAGGED_CLS';

export const PREVENT_NEXT_PROCESS = 'PREVENT_NEXT_PROCESS';
