/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-05-18 09:28:15
 */
import { Service, Autowired } from "../../../src/index";
import { App } from '../App';
import { TestModel } from "../model/TestModel";
import { CommonService, MoInterface } from './CommonService';

@Service()
export class DataService extends CommonService {
    app: App;
    @Autowired()
    Model: TestModel;

    init(aa: string) {
        //property
    }

    // @Scheduled("*/10 * * * * *")
    // @SchedulerLock()
    async task() {
        const info = await this.Model.init();
        console.log('Schedule task run...');
        await new Promise((resolve: any) => setTimeout(resolve, 5000));
        // return Promise.resolve("aa");
    }
}