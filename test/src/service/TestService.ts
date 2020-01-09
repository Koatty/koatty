/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-01-09 18:17:14
 */
import { Service, Base, Autowired, Scheduled } from "../../../src/index";
import { App } from '../App';
import { CommonService, MoInterface } from './CommonService';
import { Dto } from '../model/Dto';

@Service()
export class TestService extends CommonService {
    app: App;

    init() {
        //property
    }

    async test(aa: Dto) {
        // return Promise.reject("aa");
        console.log('TestService.test');
        return Promise.resolve(aa);
    }
}