import { IOContainer } from './Container';
import { ManagedValue, VALUE_TYPE } from 'injection';
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-20 15:19:21
 */

export class RequestContainer extends IOContainer {
    public applicationContext: IOContainer;

    public constructor(applicationContext: any) {
        super();
        this.parent = applicationContext;
        this.applicationContext = applicationContext;
    }

    /**
     * 
     * @param identifier 
     * @param args 
     */
    public get<T>(identifier: any, args?: any) {
        if (typeof identifier !== 'string') {
            // tslint:disable-next-line: no-parameter-reassignment
            identifier = this.getIdentifier(identifier);
        }
        if (this.registry.hasObject(identifier)) {
            return this.registry.getObject(identifier);
        }
        const definition = this.applicationContext.registry.getDefinition(identifier);
        if (definition && definition.isRequestScope()) {
            // create object from applicationContext definition for requestScope
            return this.resolverFactory.create(definition, args);
        }

        if (this.parent) {
            return this.parent.get(identifier, args);
        }
    }

    /**
     *
     * @param identifier identifier
     * @param args args
     */
    public async getAsync<T>(identifier: any, args?: any) {
        if (typeof identifier !== 'string') {
            // tslint:disable-next-line: no-parameter-reassignment
            identifier = this.getIdentifier(identifier);
        }
        if (this.registry.hasObject(identifier)) {
            return this.registry.getObject(identifier);
        }

        const definition = this.applicationContext.registry.getDefinition(identifier);
        if (definition && definition.isRequestScope()) {
            if (definition.creator.constructor.name === 'FunctionWrapperCreator') {
                const valueManagedIns = new ManagedValue(this, VALUE_TYPE.OBJECT);
                definition.constructorArgs = [valueManagedIns];
            }
            // create object from applicationContext definition for requestScope
            return this.resolverFactory.createAsync(definition, args);
        }

        if (this.parent) {
            return this.parent.getAsync<T>(identifier, args);
        }
    }
}
