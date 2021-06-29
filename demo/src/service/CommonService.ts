/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-05-18 09:28:05
 */
import { Service, BaseService, Value, Autowired, Logger, Helper } from "../../../src/index";
import { App } from '../App';

export interface MoInterface { rel: boolean; sortby: any; field: any[]; ispage: boolean; pagesize: number; page: number; }

@Service()
export class CommonService extends BaseService {
    app: App;

    protected Model: any;

    // __before() {
    //     console.log('CommonService.__before');
    // }


    /**
     * 列表查询
     *
     * @param {*} map
     * @param {MoInterface} mo
     * @param {*} [model]
     * @returns
     * @memberof CommonService
     */
    list(map: any, mo: MoInterface, model?: any) {
        model = model || this.Model;
        return Promise.resolve("CommonService.list");
    }

}