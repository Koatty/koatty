/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-18 09:32:15
 */
import { Autowired, Component, Service, BaseService, Value } from '../../../src/index';
import { BaseModel } from './BaseModel';

@Component()
export class TestModel extends BaseModel {
    @Value("test")
    config: any;
    aa: string;

    init() {
        // this.config = this.dbConf;
    }
}