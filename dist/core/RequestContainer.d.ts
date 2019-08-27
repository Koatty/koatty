import { IOContainer } from './Container';
export declare class RequestContainer extends IOContainer {
    applicationContext: IOContainer;
    constructor(applicationContext: any);
    get<T>(identifier: any, args?: any): any;
    getAsync<T>(identifier: any, args?: any): Promise<any>;
}
