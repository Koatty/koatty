/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2019-12-02 14:49:55
 */
import { Service, Base, Autowired, Scheduled } from "../../../src/index";
import { App } from '../App';
import { CommonService, MoInterface } from './CommonService';

@Service()
export class TestService extends CommonService {
    app: App;

    init() {
        //property
    }

    async test() {
        return Promise.reject("aa");
    }
}