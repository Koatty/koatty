/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-27 15:00:58
 */
import { CLASS_KEY_CONSTRUCTOR, CONFIG_KEY, FUNCTION_INJECT_KEY, TAGGED_CLS } from './Constants';
import * as helper from "think_lib";
import { IContainer, ObjectDefinitionOptions } from './IContainer';

interface HandlerMaps {
    type: string;
    map: Map<string, (handlerKey: string, instance?: any) => any>;
}

export class Container implements IContainer {
    public handlerMap: HandlerMaps;
    public constructor(type: string) {
        this.handlerMap = {
            type,
            map: new Map<string, (handlerKey: string, instance?: any) => any>()
        };
    }
    public registry<T>(target: T, options?: ObjectDefinitionOptions): T;
    public registry<T>(identifier: string, target: T, options?: ObjectDefinitionOptions): T;
    public registry(identifier: any, target?: any, options?: any) {
        let definition;
        // definition.autowire = true;
        if (helper.isClass(identifier) || helper.isFunction(identifier)) {
            options = target;
            target = <any>identifier;
            identifier = this.getIdentifier(target);
            options = null;
        }

        if (is.class(target)) {
            definition = new ObjectDefinition();
        } else {
            definition = new FunctionDefinition(this);
        }

        definition.path = target;
        definition.id = identifier;

        debug(`=> bind and build definition, id = [${definition.id}]`);

        // inject constructArgs
        const constructorMetaData = Reflect.getMetadata(TAGGED, target);
        if (constructorMetaData) {
            debug(`   register inject constructor length = ${target['length']}`);
            const maxLength = Math.max.apply(null, Object.keys(constructorMetaData));
            for (let i = 0; i < maxLength + 1; i++) {
                const propertyMeta = constructorMetaData[i];
                if (propertyMeta) {
                    const refManagedIns = new ManagedReference();
                    refManagedIns.name = propertyMeta[0].value;
                    definition.constructorArgs.push(refManagedIns);
                } else {
                    // inject empty value
                    const valueManagedIns = new ManagedValue();
                    valueManagedIns.value = undefined;
                    definition.constructorArgs.push(valueManagedIns);
                }
            }
        }

        // inject properties
        const metaDatas = recursiveGetMetadata(TAGGED_PROP, target);
        for (const metaData of metaDatas) {
            debug(`   register inject properties = [${Object.keys(metaData)}]`);
            for (const metaKey in metaData) {
                for (const propertyMeta of metaData[metaKey]) {
                    const refManaged = new ManagedReference();
                    refManaged.name = propertyMeta.value;
                    definition.properties.set(metaKey, refManaged);
                }
            }
        }

        this.convertOptionsToDefinition(options, definition);
        // 对象自定义的annotations可以覆盖默认的属性
        this.registerCustomBinding(definition, target);

        this.registerDefinition(identifier, definition);
    }
    public isAsync(identifier: string): boolean {
        throw new Error("Method not implemented.");
    }
    public get<T>(identifier: string, args?: any): T {
        throw new Error("Method not implemented.");
    }
    public getAsync<T>(identifier: string, args?: any): Promise<T> {
        throw new Error("Method not implemented.");
    }

    /**
     * 
     * @param target 
     */
    protected getIdentifier(target: any) {
        const metaData = Reflect.getOwnMetadata(TAGGED_CLS, target);
        if (metaData) {
            return metaData.id;
        } else {
            return helper.camelCase(target.name, { pascalCase: true });
        }
    }
}
