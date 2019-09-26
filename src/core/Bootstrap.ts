/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-26 11:35:06
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import { saveClassMetadata, getClassMetadata, listModule } from './Injectable';
import { INJECT_TAG, COMPONENT_SCAN, CONFIGUATION_SCAN, CONTROLLER_KEY } from './Constants';
import { Container } from './Container';
import { Loader } from '../util/Loader';
import { RequestContainer } from './RequestContainer';
const debug = require('debug')('bootstrap');

export function Bootstrap(): ClassDecorator {
    debug('Bootstrap');

    return (target: any) => {
        try {
            let componentMetas = [];
            const componentMeta = getClassMetadata(INJECT_TAG, COMPONENT_SCAN, target);
            if (componentMeta) {
                if (!helper.isArray(componentMeta)) {
                    componentMetas.push(componentMeta);
                } else {
                    componentMetas = componentMeta;
                }
            }
            if (componentMetas.length < 1) {
                componentMetas = ['./'];
            }
            Loader.loadDirectory(componentMetas);

            const configuationMeta = getClassMetadata(INJECT_TAG, CONFIGUATION_SCAN, target);
            let configuationMetas = [];
            if (configuationMeta) {
                if (!helper.isArray(configuationMeta)) {
                    configuationMetas.push(configuationMeta);
                } else {
                    configuationMetas = configuationMeta;
                }
            }
            debug(configuationMetas);


            const app = new target();

            Loader.loadConfigs(app, configuationMetas);

            const container = new Container(app);
            Loader.loadCmponents(app, container);


            const requestContainer = new RequestContainer(app);
            helper.define(app, 'Container', requestContainer);
            Loader.loadControllers(app, requestContainer);
            Loader.loadMiddlewares(app);

            // start app
            app.listen();
        } catch (error) {
            console.error(error);
            process.exit();
        }
    };
}

export function ComponentScan(scanPath?: string | string[]): ClassDecorator {
    debug('ComponentScan');

    return (target: any) => {
        scanPath = scanPath || '';
        saveClassMetadata(INJECT_TAG, COMPONENT_SCAN, scanPath, target);
    };
}

export function ConfiguationScan(scanPath?: string | string[]): ClassDecorator {
    debug("ConfiguationScan");

    return (target: any) => {
        scanPath = scanPath || '';
        saveClassMetadata(INJECT_TAG, CONFIGUATION_SCAN, scanPath, target);
    };
}
