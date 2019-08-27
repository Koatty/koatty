"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Container_1 = require("./Container");
const injection_1 = require("injection");
class RequestContainer extends Container_1.IOContainer {
    constructor(applicationContext) {
        super();
        this.parent = applicationContext;
        this.applicationContext = applicationContext;
    }
    get(identifier, args) {
        if (typeof identifier !== 'string') {
            identifier = this.getIdentifier(identifier);
        }
        if (this.registry.hasObject(identifier)) {
            return this.registry.getObject(identifier);
        }
        const definition = this.applicationContext.registry.getDefinition(identifier);
        if (definition && definition.isRequestScope()) {
            return this.resolverFactory.create(definition, args);
        }
        if (this.parent) {
            return this.parent.get(identifier, args);
        }
    }
    getAsync(identifier, args) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (typeof identifier !== 'string') {
                identifier = this.getIdentifier(identifier);
            }
            if (this.registry.hasObject(identifier)) {
                return this.registry.getObject(identifier);
            }
            const definition = this.applicationContext.registry.getDefinition(identifier);
            if (definition && definition.isRequestScope()) {
                if (definition.creator.constructor.name === 'FunctionWrapperCreator') {
                    const valueManagedIns = new injection_1.ManagedValue(this, injection_1.VALUE_TYPE.OBJECT);
                    definition.constructorArgs = [valueManagedIns];
                }
                return this.resolverFactory.createAsync(definition, args);
            }
            if (this.parent) {
                return this.parent.getAsync(identifier, args);
            }
        });
    }
}
exports.RequestContainer = RequestContainer;
//# sourceMappingURL=RequestContainer.js.map