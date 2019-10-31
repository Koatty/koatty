/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-31 18:20:46
 */
import * as helper from "think_lib";
import { BaseController } from "./BaseController";
import { GetMaping, PathVariable, PostMaping, DeleteMaping, PutMaping, RequestBody } from "../core/RequestMapping";

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
     *
     *
     * @returns
     * @memberof RestController
     */
    __empty() {
        return this.fail('not found.', '', 404);
    }

    /**
     *
     *
     * @param {(number | string)} id
     * @param {string} resource
     * @returns
     * @memberof RestController
     */
    @GetMaping("/:resource/:id")
    async getResource(@PathVariable("id") id: number | string, @PathVariable("resource") resource: string) {
        if (helper.isEmpty(id)) {
            return this.fail('id is empty');
        }
        if (helper.isEmpty(resource)) {
            return this.fail('resource is empty');
        }
        if (!this.model) {
            const resourceName = helper.camelCase(resource, { pascalCase: true });
            this.model = this.app.Container.get(resourceName, "COMPONENT");
            if (!this.model || !this.model.pk) {
                return this.fail(`the model: ${resourceName} not found.`);
            }
        }

        try {
            if (id) {
                const pk = await this.model.getPk();
                const data = await this.model.where({ [pk]: id }).find();
                return this.ok('success', data);
            } else {
                const data = await this.model.limit(10000).select();
                return this.ok('success', data);
            }
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
    @PostMaping("/:resource/:id")
    async postResource(@PathVariable("id") id: number | string, @PathVariable("resource") resource: string, @RequestBody() data: any) {
        if (helper.isEmpty(id)) {
            return this.fail('id is empty');
        }
        if (helper.isEmpty(resource)) {
            return this.fail('resource is empty');
        }
        if (helper.isEmpty(data) || helper.isEmpty(data.post)) {
            return this.fail('body is empty');
        }
        if (!this.model) {
            const resourceName = helper.camelCase(resource, { pascalCase: true });
            this.model = this.app.Container.get(resourceName, "COMPONENT");
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
    @DeleteMaping("/:resource/:id")
    async deleteResource(@PathVariable("id") id: number | string, @PathVariable("resource") resource: string) {
        if (helper.isEmpty(id)) {
            return this.fail('id is empty');
        }
        if (helper.isEmpty(resource)) {
            return this.fail('resource is empty');
        }
        if (!this.model) {
            const resourceName = helper.camelCase(resource, { pascalCase: true });
            this.model = this.app.Container.get(resourceName, "COMPONENT");
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
    @PutMaping("/:resource/:id")
    async putResource(@PathVariable("id") id: number | string, @PathVariable("resource") resource: string, @RequestBody() data: any) {
        if (helper.isEmpty(id)) {
            return this.fail('id is empty');
        }
        if (helper.isEmpty(resource)) {
            return this.fail('resource is empty');
        }
        if (helper.isEmpty(data) || helper.isEmpty(data.post)) {
            return this.fail('body is empty');
        }
        if (!this.model) {
            const resourceName = helper.camelCase(resource, { pascalCase: true });
            this.model = this.app.Container.get(resourceName, "COMPONENT");
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