/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-30 13:45:39
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import { Loader } from './Loader';
import { reverseInject, componentInject } from './Injectable';
import { saveClassMetadata, getClassMetadata, listModule } from './Decorators';
import { COMPONENT_KEY, INJECT_TAG, COMPONENT_SCAN } from './Constants';
import { Container } from './Container';

export function Bootstrap(): ClassDecorator {
    console.log('Bootstrap');
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
        const loader = new Loader();
        loader.loadDirectory({ loadDir: metas });
        componentInject(target);
    };
}

export function ComponentScan(scanPath?: string | string[]): ClassDecorator {
    console.log('ComponentScan');

    return (target: any) => {
        scanPath = scanPath || '';
        saveClassMetadata(INJECT_TAG, COMPONENT_SCAN, scanPath, target);
    };
}


