/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2019-11-29 17:24:29
 */
import { Service, Base, Autowired, Scheduled } from "../../../src/index";
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

    @Scheduled("*/1 * * * *")
    async task() {
        const info = await this.Model.init();
        console.log('Schedule task run...');
        return Promise.reject("aa");
    }
}