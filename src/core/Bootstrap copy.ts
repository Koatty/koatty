/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-26 14:11:45
 */
// tslint:disable-next-line: no-var-requires
import * as globby from 'globby';
import * as path from 'path';
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
// tslint:disable-next-line: no-var-requires
const debug = require('debug')('koatty:Bootstrap');
import { Container } from 'injection';

export function Bootstrap(target: any) {
    const loader = new Loader(path.join(process.cwd(), './test'));
    loader.loadDirectory();
    loader.applicationContext.ready();
    setTimeout(() => {

        const cls: any = loader.applicationContext.get('Test1');
        console.log(cls.sayHello());
        // tslint:disable-next-line: no-magic-numbers
    }, 5000);
}

function buildLoadDir(baseDir: string, dir: string) {
    if (!path.isAbsolute(dir)) {
        return path.join(baseDir, dir);
    }
    return dir;
}

class Loader {
    public baseDir: string;
    public applicationContext: Container;
    public preloadModules: Array<string>;

    public constructor(baseDir: string, preloadModules: Array<string> = []) {
        this.baseDir = baseDir;
        this.preloadModules = preloadModules;
        this.applicationContext = new Container(this.baseDir, undefined);
        this.applicationContext.registerObject('baseDir', this.baseDir);
    }

    public loadDirectory(loadOpts: {
        baseDir?: string;
        loadDir?: string[];
        pattern?: string;
        ignore?: string;
        configLocations?: string[];
    } = {}) {
        // use baseDir in parameter first
        const baseDir = loadOpts.baseDir || this.baseDir;
        let defaultLoadDir: any = [];
        if (!Array.isArray(baseDir)) {
            defaultLoadDir.push(baseDir);
        } else {
            defaultLoadDir = baseDir;
        }

        defaultLoadDir = defaultLoadDir.map((dir: string) => {
            return buildLoadDir(baseDir, dir);
        });

        this.load(defaultLoadDir, loadOpts.pattern, loadOpts.ignore);
    }

    /**
     * 
     * @param loadDir 
     * @param pattern 
     * @param ignore 
     */
    public load(loadDir: string | string[],
        pattern?: string | string[],
        ignore?: string | string[]) {
        const loadDirs = [].concat(loadDir || []);

        for (const dir of loadDirs) {
            const fileResults = globby.sync(['**/**.ts', '**/**.tsx', '**/**.js', '!**/**.d.ts'].concat(pattern || []), {
                cwd: dir,
                ignore: [
                    '**/node_modules/**',
                    '**/logs/**',
                    '**/run/**',
                    '**/static/**'
                ].concat(ignore || [])
            });

            for (const name of fileResults) {
                const file = path.join(dir, name);
                console.log(`binding file => ${file}`);
                const exports = require(file);
                this.applicationContext.bindClass(exports);
            }
        }
    }
}
