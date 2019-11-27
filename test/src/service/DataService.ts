/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2019-11-25 19:45:22
 */
import { Service, Base, Autowired } from "../../../src/index";
import { App } from '../App';
import { TestModel } from "../model/TestModel";
import { CommonService, MoInterface } from './CommonService';

@Service()
export class DataService extends CommonService {
    app: App;
    @Autowired()
    Model: TestModel;

    init() {
        //property
    }

    /**
     *
     *
     * @param {*} map
     * @param {MoInterface} mo
     * @returns
     * @memberof DataService
     */
    list(map: any, mo: MoInterface) {
        return super.list(map, mo, this.Model);
    }
}