/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-01-19 15:43:18
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

    @Scheduled("0 * * * * *", true, 60000, 10000)
    async task() {
        const info = await this.Model.init();
        console.log('Schedule task run...');
        // await new Promise((resolve: any) => setTimeout(resolve, 50000));
        return Promise.reject("aa");
    }
}