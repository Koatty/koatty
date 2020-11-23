/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:19:16
 */
import { Helper } from "../util/Helper";
import { IOCContainer } from "koatty_container";
import { BaseController } from "./BaseController";
import { GetMapping, PathVariable, PostMapping, DeleteMapping, PutMapping, RequestBody } from "../core/RequestMapping";

/**
 * RESTful controller
 *
 * @export
 * @class RestController
 * @extends {BaseController}
 */
export class RestController extends BaseController {
    private model: any;

    /**
     * init
     *
     * @protected
     * @memberof BaseController
     */
    protected init(): void {

    }

    /**
     *
     *
     * @param {(number | string)} id
     * @param {string} resource
     * @returns
     * @memberof RestController
     */
    @GetMapping('/:resource/:id')
    async getResource(@PathVariable('id') id: number | string, @PathVariable('resource') resource: string) {
        if (Helper.isEmpty(id)) {
            return this.fail('id is empty');
        }
        if (Helper.isEmpty(resource)) {
            return this.fail('resource is empty');
        }
        if (!this.model) {
            const resourceName = Helper.camelCase(resource, true);
            this.model = IOCContainer.get(`${resourceName}Model`, 'COMPONENT');
            if (!this.model || !this.model.pk) {
                return this.fail(`the model: ${resourceName} not found.`);
            }
        }

        try {
            if (id) {
                const pk = await this.model.getPk();
                const data = await this.model.where({ [pk]: id }).find();
                return this.ok('success', data);
            }
            const data = await this.model.limit(10000).select();
            return this.ok('success', data);
        } catch (err) {
            return this.fail(err.message || 'get resource error');
        }
    }

    /**
     *
     *
     * @param {(number | string)} id
     * @param {string} resource
     * @param {*} data
     * @returns
     * @memberof RestController
     */
    @PostMapping('/:resource/:id')
    async postResource(@PathVariable('id') id: number | string, @PathVariable('resource') resource: string, @RequestBody() data: any) {
        if (Helper.isEmpty(id)) {
            return this.fail('id is empty');
        }
        if (Helper.isEmpty(resource)) {
            return this.fail('resource is empty');
        }
        if (Helper.isEmpty(data) || Helper.isEmpty(data.post)) {
            return this.fail('body is empty');
        }
        if (!this.model) {
            const resourceName = Helper.camelCase(resource, true);
            this.model = IOCContainer.get(`${resourceName}Model`, 'COMPONENT');
            if (!this.model || !this.model.pk) {
                return this.fail(`the model: ${resourceName} not found.`);
            }
        }

        try {
            const res = await this.model.add(data.post);
            return this.ok('success', res);
        } catch (err) {
            return this.fail(err.message || 'post resource error');
        }
    }

    /**
     *
     *
     * @param {(number | string)} id
     * @param {string} resource
     * @returns
     * @memberof RestController
     */
    @DeleteMapping('/:resource/:id')
    async deleteResource(@PathVariable('id') id: number | string, @PathVariable('resource') resource: string) {
        if (Helper.isEmpty(id)) {
            return this.fail('id is empty');
        }
        if (Helper.isEmpty(resource)) {
            return this.fail('resource is empty');
        }
        if (!this.model) {
            const resourceName = Helper.camelCase(resource, true);
            this.model = IOCContainer.get(`${resourceName}Model`, 'COMPONENT');
            if (!this.model || !this.model.pk) {
                return this.fail(`the model: ${resourceName} not found.`);
            }
        }

        try {
            const pk = await this.model.getPk();
            const rows = await this.model.where({ [pk]: id }).delete();
            return this.ok('success', rows);
        } catch (err) {
            return this.fail(err.message || 'delete resource error');
        }
    }

    /**
     *
     *
     * @param {(number | string)} id
     * @param {string} resource
     * @param {*} data
     * @returns
     * @memberof RestController
     */
    @PutMapping('/:resource/:id')
    async putResource(@PathVariable('id') id: number | string, @PathVariable('resource') resource: string, @RequestBody() data: any) {
        if (Helper.isEmpty(id)) {
            return this.fail('id is empty');
        }
        if (Helper.isEmpty(resource)) {
            return this.fail('resource is empty');
        }
        if (Helper.isEmpty(data) || Helper.isEmpty(data.post)) {
            return this.fail('body is empty');
        }
        if (!this.model) {
            const resourceName = Helper.camelCase(resource, true);
            this.model = IOCContainer.get(`${resourceName}Model`, 'COMPONENT');
            if (!this.model || !this.model.pk) {
                return this.fail(`the model: ${resourceName} not found.`);
            }
        }

        try {
            const pk = await this.model.getPk();
            const rows = await this.model.where({ [pk]: id }).update(data.post);
            return this.ok('success', rows);
        } catch (err) {
            return this.fail(err.message || 'put resource error');
        }
    }
}
