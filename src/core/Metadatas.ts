import 'reflect-metadata';
import { TagPropsMetadata, NAMED_TAG, TAGGED, TAGGED_PROP, ReflectResult } from "injection";

/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-23 15:41:01
 */

export class Metadatas implements TagPropsMetadata {

    public key: string | number | symbol;
    public value: any;

    public constructor(key: string | number | symbol, value: any) {
        this.key = key;
        this.value = value;
    }

    public toString() {
        if (this.key === NAMED_TAG) {
            return `named: ${this.value.toString()} `;
        } else {
            return `tagged: { key:${this.key.toString()}, value: ${this.value} }`;
        }
    }
}


function tagParameter(
    annotationTarget: any,
    propertyName: string,
    parameterIndex: number,
    metadata: TagPropsMetadata
) {
    _tagParameterOrProperty(TAGGED, annotationTarget, propertyName, metadata, parameterIndex);
}

function tagProperty(
    annotationTarget: any,
    propertyName: string,
    metadata: TagPropsMetadata
) {
    _tagParameterOrProperty(TAGGED_PROP, annotationTarget.constructor, propertyName, metadata);
}

function _tagParameterOrProperty(
    metadataKey: string,
    annotationTarget: any,
    propertyName: string,
    metadata: TagPropsMetadata,
    parameterIndex?: number
) {

    let paramsOrPropertiesMetadata: ReflectResult = {};
    const isParameterDecorator = (typeof parameterIndex === 'number');
    const key: string = (parameterIndex !== undefined && isParameterDecorator) ? parameterIndex.toString() : propertyName;

    // if the decorator is used as a parameter decorator, the property name must be provided
    if (isParameterDecorator && propertyName !== undefined) {
        throw new Error('The @inject @multiInject @tagged and @named decorators ' +
            'must be applied to the parameters of a class constructor or a class property.');
    }

    // read metadata if available
    if (Reflect.hasOwnMetadata(metadataKey, annotationTarget)) {
        paramsOrPropertiesMetadata = Reflect.getMetadata(metadataKey, annotationTarget);
    }

    // get metadata for the decorated parameter by its index
    let paramOrPropertyMetadata: TagPropsMetadata[] = paramsOrPropertiesMetadata[key];

    if (!Array.isArray(paramOrPropertyMetadata)) {
        paramOrPropertyMetadata = [];
    } else {
        for (const m of paramOrPropertyMetadata) {
            if (m.key === metadata.key) {
                throw new Error(`Metadata key was used more than once in a parameter: ${m.key.toString()}`);
            }
        }
    }

    // set metadata
    paramOrPropertyMetadata.push(metadata);
    paramsOrPropertiesMetadata[key] = paramOrPropertyMetadata;
    Reflect.defineMetadata(metadataKey, paramsOrPropertiesMetadata, annotationTarget);
}

export { tagParameter, tagProperty };