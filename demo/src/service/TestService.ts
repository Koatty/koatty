/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-05-19 14:28:30
 */
import { Service, Helper, Exception, Value } from "../../../src/index";
import { App } from '../App';
import { CommonService, MoInterface } from './CommonService';
import { TestDto } from '../model/TestDto';

@Service()
export class TestService extends CommonService {
    app: App;
    @Value("test")
    conf: any;

    init() {
        //property
    }

    // @CacheAble("test")
    async test(aa: TestDto) {
        // return Promise.reject("aa");
        console.log('TestService.test');
        return aa;
    }
    async test1(name: string, age?: number) {
        const pf = Helper.getDefer();
        setTimeout(() => {
            const err = new Error('TestService.test1');
            pf.reject(err);
        }, 1000);
        // console.log('TestService.test1');
        // return Promise.reject("aaaaa");
        // throw Error("aaaaaa");
        // console.log(this.app.trace.get("traceId"));
        return pf.promise;
    }

    async test2() {
        // throw new Exception("exception", 1, HttpStatusCode.BAD_REQUEST);
        throw new Exception("aaa");

        console.log('TestService.test2');
        return "";
    }

    // @Scheduled("0 * * * * *")
    // @SchedulerLock()
    scheduleTest() {
        console.log('TestService.scheduleTest');
        console.log(this.conf);
        return;
    }
}