/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-18 21:04:23
 */
import { Autowired, Component, Service, Base, Value } from '../../../src/index';
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