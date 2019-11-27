/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2019-11-25 15:26:48
 */
import { Service, Base, Value, Autowired, Logger, Helper } from "../../../src/index";
import { App } from '../App';

export interface MoInterface { rel: boolean; sortby: any; field: any[]; ispage: boolean; pagesize: number; page: number; }

@Service()
export class CommonService extends Base {
    app: App;

    protected Model: any;


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