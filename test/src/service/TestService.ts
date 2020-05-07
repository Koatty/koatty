/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-05-07 15:32:59
 */
import { Service, Base, Autowired, Scheduled, Cacheable, SchedulerLock } from "../../../src/index";
import { App } from '../App';
import { CommonService, MoInterface } from './CommonService';
import { TestDto } from '../model/TestDto';

@Service()
export class TestService extends CommonService {
    app: App;

    init() {
        //property
    }

    // @Cacheable("test")
    async test(aa: TestDto) {
        // return Promise.reject("aa");
        console.log('TestService.test');
        return Promise.resolve(aa);
    }
    async test1(name: string) {
        // throw Error('TestService.test1');
        // console.log('TestService.test1');
        return name;
    }

    @Scheduled("0 * * * * *")
    @SchedulerLock()
    scheduleTest() {
        console.log('TestService.scheduleTest');
        return;
    }
}