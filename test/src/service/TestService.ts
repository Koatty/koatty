/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-03-06 18:24:25
 */
import { Service, Base, Autowired, Scheduled, Cacheable } from "../../../src/index";
import { App } from '../App';
import { CommonService, MoInterface } from './CommonService';
import { Dto } from '../model/Dto';

@Service()
export class TestService extends CommonService {
    app: App;

    init() {
        //property
    }

    @Cacheable("test", 0)
    async test(aa: Dto) {
        // return Promise.reject("aa");
        console.log('TestService.test');
        return Promise.resolve(aa);
    }
}