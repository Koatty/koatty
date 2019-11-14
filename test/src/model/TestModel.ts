/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-14 14:06:27
 */
import { Autowired, Component, Service, Base, Value } from '../../../src/index';
import { BaseModel } from './BaseModel';

@Component()
export class TestModel extends BaseModel {
    @Value("test")
    dbConf: any;
    aa: string;

    init() {
        // this.config = this.dbConf;
    }
}