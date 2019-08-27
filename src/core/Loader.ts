/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-26 17:29:50
 */
import * as globby from 'globby';
import * as path from 'path';
/**
 * 
 * @param baseDir 
 * @param dir 
 */
function buildLoadDir(baseDir: string, dir: string) {
    if (!path.isAbsolute(dir)) {
        return path.join(baseDir, dir);
    }
    return dir;
}

/**
 * 
 */
export class Loader {
    public baseDir: string;

    public constructor(baseDir: string = process.cwd()) {
        this.baseDir = baseDir;
    }

    public loadDirectory(loadOpts: {
        baseDir?: string;
        loadDir?: string | string[];
        pattern?: string;
        ignore?: string;
        configLocations?: string[];
    } = {}) {
        // use baseDir in parameter first
        const baseDir = loadOpts.baseDir || this.baseDir;
        let defaultLoadDir: any = [];
        if (!Array.isArray(loadOpts.loadDir)) {
            defaultLoadDir.push(loadOpts.loadDir);
        } else {
            defaultLoadDir = loadOpts.loadDir;
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
            }
        }
    }
}
