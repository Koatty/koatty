import { Container, IApplicationContext, IContainer } from 'injection';
export declare class IOContainer extends Container implements IContainer {
    handlerMap: Map<string, (handlerKey: string, instance?: any) => any>;
    constructor(baseDir?: string, parent?: IApplicationContext);
    init(): void;
    findHandlerHook(hookKey: string): any;
    registerDataHandler(handlerType: string, handler: (handlerKey: any) => any): void;
    registerCustomBinding(objectDefinition: any, target: any): void;
    bindClass(exports: any): void;
    protected bindModule(module: any): void;
    protected registerEachCreatedHook(): void;
    private defineGetterPropertyValue;
}
