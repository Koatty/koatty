/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-09 15:27:22
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import * as logger from "think_logger";
import { saveClassMetadata, getClassMetadata } from './Injectable';
import { INJECT_TAG, COMPONENT_SCAN, CONFIGUATION_SCAN } from './Constants';
import { Container } from './Container';
import { Loader } from '../util/Loader';

export function Bootstrap(): ClassDecorator {
    logger.custom('think', '', 'Bootstrap');

    return (target: any) => {
        try {
            const app = new target();

            logger.custom('think', '', 'loadDirectory ...');
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
                componentMetas = [app.app_path];
            }
            Loader.loadDirectory(componentMetas);

            logger.custom('think', '', 'loadConfiguation ...');
            const configuationMeta = getClassMetadata(INJECT_TAG, CONFIGUATION_SCAN, target);
            let configuationMetas = [];
            if (configuationMeta) {
                if (!helper.isArray(configuationMeta)) {
                    configuationMetas.push(configuationMeta);
                } else {
                    configuationMetas = configuationMeta;
                }
            }

            Loader.loadConfigs(app, configuationMetas);

            const container = new Container(app);
            helper.define(app, 'Container', container);

            logger.custom('think', '', 'loadComponents ...');
            Loader.loadCmponents(app, container);

            logger.custom('think', '', 'loadControllers ...');
            Loader.loadControllers(app, container);

            logger.custom('think', '', 'loadMiddlewares ...');
            Loader.loadMiddlewares(app, container);

            // start app
            logger.custom('think', '', 'Listening ...');
            app.listen();
        } catch (error) {
            logger.error(error);
            process.exit();
        }
    };
}

export function ComponentScan(scanPath?: string | string[]): ClassDecorator {
    logger.custom('think', '', 'ComponentScan');

    return (target: any) => {
        scanPath = scanPath || '';
        saveClassMetadata(INJECT_TAG, COMPONENT_SCAN, scanPath, target);
    };
}

export function ConfiguationScan(scanPath?: string | string[]): ClassDecorator {
    logger.custom('think', '', "ConfiguationScan");

    return (target: any) => {
        scanPath = scanPath || '';
        saveClassMetadata(INJECT_TAG, CONFIGUATION_SCAN, scanPath, target);
    };
}
