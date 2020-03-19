/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-03-19 18:22:53
 */
import { Service, Base, Autowired, Scheduled, SchedulerLock } from "../../../src/index";
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

    @Scheduled("*/10 * * * * *")
    @SchedulerLock()
    async task() {
        const info = await this.Model.init();
        console.log('Schedule task run...');
        await new Promise((resolve: any) => setTimeout(resolve, 5000));
        // return Promise.resolve("aa");
    }
}