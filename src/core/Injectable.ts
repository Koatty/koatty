/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-27 15:05:53
 */
import * as helper from "think_lib";
import { listModule, saveModule, saveClassMetadata, savePropertyDataToClass, listPropertyDataFromClass } from "./Decorators";
import { CONTROLLER_KEY, COMPONENT_KEY, MIDDLEWARE_KEY, TAGGED_PROP } from './Constants';
/**
 * 
 * @param target 
 */
export function reverseInject<T>(target: T | any): T {
    try {
        const componentList = listModule(COMPONENT_KEY);
        console.log(componentList);
        const controllerList = listModule(CONTROLLER_KEY);
        console.log(controllerList);
        const middlewareList = listModule(MIDDLEWARE_KEY);
        console.log(middlewareList);

        const allList = [...componentList, ...controllerList, ...middlewareList];
        allList.map((item: any) => {
            console.log('allList:', item.name);
            const depends = listPropertyDataFromClass(TAGGED_PROP, item);
            depends.map((it: any) => {
                console.log('depends:', item.name, '-->', it);
            });
        });


        const ins = new target();
        return ins.listen();
    } catch (error) {

    }
}

export function Component(identifier?: any): ClassDecorator {
    console.log('Injectable: Component');

    return (target: any) => {
        identifier = identifier || target.name;
        saveModule(COMPONENT_KEY, target);
        saveClassMetadata(COMPONENT_KEY, identifier, target);
    };
}
export function Autowired(identifier?: any): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        console.log(TAGGED_PROP, identifier, propertyKey);
        identifier = identifier || helper.camelCase(propertyKey, { pascalCase: true });
        savePropertyDataToClass(TAGGED_PROP, identifier, target, propertyKey);
    };
}
export function Controller(path?: any): ClassDecorator {
    console.log('Injectable: Controller');

    return (target: any) => {
        saveModule(CONTROLLER_KEY, target);
        saveClassMetadata(CONTROLLER_KEY, path, target);
    };
}
export function Middleware(identifier?: any): ClassDecorator {
    console.log('Injectable: Controller');

    return (target: any) => {
        identifier = identifier || target.name;
        saveModule(CONTROLLER_KEY, target);
        saveClassMetadata(COMPONENT_KEY, identifier, target);
    };
}
export function Service(identifier?: any): ClassDecorator {
    console.log('Injectable: Service');

    return (target: any) => {
        identifier = identifier || target.name;
        saveModule(COMPONENT_KEY, target);
        saveClassMetadata(COMPONENT_KEY, identifier, target);
    };
}