/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-27 14:53:28
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import { Loader } from './Loader';
import { reverseInject } from './Injectable';
import { saveClassMetadata, getClassMetadata } from './Decorators';
import { COM_SCAN } from './Constants';

export function Bootstrap(): ClassDecorator {
    console.log('Bootstrap');
    return (target: any) => {
        //定义初始化参数
        console.log('定义初始化参数...');
        const meta = getClassMetadata(COM_SCAN, target);
        let metas = [];
        if (!helper.isArray(meta)) {
            metas.push(meta);
        } else {
            metas = meta;
        }
        const loader = new Loader();
        loader.loadDirectory({ loadDir: metas });
        reverseInject(target);
    };
    // setTimeout(() => {
    //     console.log(loader.applicationContext.handlerMap);

    //     const cls: any = loader.applicationContext.get('Test1');
    //     console.log(cls.sayHello());
    //     // tslint:disable-next-line: no-magic-numbers
    // }, 5000);
}

export function ComponentScan(scanPath?: string | string[]): ClassDecorator {
    console.log('ComponentScan');

    return (target: any) => {
        scanPath = scanPath || '';
        saveClassMetadata(COM_SCAN, scanPath, target);
    };
}


