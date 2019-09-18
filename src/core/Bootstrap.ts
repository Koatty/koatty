/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-18 13:49:19
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import { saveClassMetadata, getClassMetadata, listModule } from './Injectable';
import { COMPONENT_KEY, INJECT_TAG, COMPONENT_SCAN } from './Constants';
import { Container } from './Container';
import { Loader } from '../util/Loader';

export function Bootstrap(): ClassDecorator {
    console.log('Bootstrap');
    console.log(__dirname);

    return (target: any) => {
        //定义初始化参数
        console.log('定义初始化参数...');
        const meta = getClassMetadata(INJECT_TAG, COMPONENT_SCAN, target);
        let metas = [];
        if (!helper.isArray(meta)) {
            metas.push(meta);
        } else {
            metas = meta;
        }
        const app = new target();
        // loadConfigs(app);
        Loader.loadDirectory('./test');
        Loader.loadModule(app);
        // componentInject(target);

        console.log('app.config', app.config());
    };
}

export function ComponentScan(scanPath?: string | string[]): ClassDecorator {
    console.log('ComponentScan');

    return (target: any) => {
        scanPath = scanPath || '';
        saveClassMetadata(INJECT_TAG, COMPONENT_SCAN, scanPath, target);
    };
}


