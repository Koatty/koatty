/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-02-25 16:01:53
 */
import { Service, Base, Autowired, Scheduled, Locked } from "../../../src/index";
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

    // @Scheduled("0 * * * * *", true, 60000, 10000)
    @Locked()
    async task() {
        const info = await this.Model.init();
        console.log('Schedule task run...');
        // await new Promise((resolve: any) => setTimeout(resolve, 50000));
        return Promise.reject("aa");
    }
}