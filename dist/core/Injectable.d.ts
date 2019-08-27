import 'reflect-metadata';
export declare function InjectClass(target: any): void;
export declare function attachConstructorDataOnClass(identifier: string, clz: any, type: any, index: number): void;
export declare function Component<T>(target?: T, identifier?: string, index?: number): any;
export interface ControllerOption {
    path: string;
    index: number;
}
export declare function Controller<T>(target?: T, path?: string, index?: number): any;
export declare function Middleware(target: any, identifier?: string): void;
export declare function Service(target: any, identifier?: string): void;
export declare function Autowired(target: any, identifier?: string): void;
export declare function Config(identifier?: string): (target: any, targetKey: string, index?: number) => void;
