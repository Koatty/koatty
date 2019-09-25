/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-24 19:47:23
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import { saveClassMetadata, getClassMetadata, listModule } from './Injectable';
import { COMPONENT_KEY, INJECT_TAG, COMPONENT_SCAN, CONFIGUATION_SCAN, CONTROLLER_KEY } from './Constants';
import { Container } from './Container';
import { Loader } from '../util/Loader';
import { RequestContainer } from './RequestContainer';

export function Bootstrap(): ClassDecorator {
    console.log('Bootstrap');

    return (target: any) => {
        try {
            //定义初始化参数
            console.log('定义初始化参数...');
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
            console.log(configuationMetas);


            //=========================================
            const app = new target();

            Loader.loadConfigs(app, configuationMetas);

            const container = new Container(app);
            Loader.loadCmponents(app, container);


            const requestContainer = new RequestContainer(app);
            helper.define(app, 'Container', requestContainer);
            Loader.loadControllers(app, requestContainer);
            Loader.loadMiddlewares(app);

            app.listen();

            // requestContainer.updateContext({ aa: 1 });
            // let ctl: any = requestContainer.get('TestController', CONTROLLER_KEY);
            // console.log(ctl.sayHello());
        } catch (error) {
            console.error(error);
            process.exit();
        }
    };
}

export function ComponentScan(scanPath?: string | string[]): ClassDecorator {
    console.log('ComponentScan');

    return (target: any) => {
        scanPath = scanPath || '';
        saveClassMetadata(INJECT_TAG, COMPONENT_SCAN, scanPath, target);
    };
}

export function ConfiguationScan(scanPath?: string | string[]): ClassDecorator {
    console.log("ConfiguationScan");

    return (target: any) => {
        scanPath = scanPath || '';
        saveClassMetadata(INJECT_TAG, CONFIGUATION_SCAN, scanPath, target);
    };
}
