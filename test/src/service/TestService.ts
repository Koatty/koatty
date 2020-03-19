/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-03-19 14:12:48
 */
import { Service, Base, Autowired, Scheduled, Cacheable } from "../../../src/index";
import { App } from '../App';
import { CommonService, MoInterface } from './CommonService';
import { TestDto } from '../model/TestDto';

@Service()
export class TestService extends CommonService {
    app: App;

    init() {
        //property
    }

    @Cacheable("test", 0)
    async test(aa: TestDto) {
        // return Promise.reject("aa");
        console.log('TestService.test');
        return Promise.resolve(aa);
    }
}