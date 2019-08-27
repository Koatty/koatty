"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const globby = tslib_1.__importStar(require("globby"));
const path = tslib_1.__importStar(require("path"));
require("reflect-metadata");
const debug = require('debug')('koatty:Bootstrap');
const Container_1 = require("./Container");
const Constants_1 = require("./Constants");
function Inject(target) {
    const targetInstance = new target();
    const depends = Reflect.getOwnMetadataKeys(target).filter((meta) => 'design:paramtypes' !== meta);
    console.log(depends);
    depends.forEach((meta) => {
        if (meta.match(Constants_1.AUTOWIRED_REG)) {
            const _constructor = Reflect.getMetadata(meta, target);
            const prop = meta.replace(Constants_1.AUTOWIRED_REG, '');
            let depInstance = Constants_1.IOC.get(_constructor);
            if (!Constants_1.IOC.has(_constructor)) {
                depInstance = Inject(_constructor);
            }
            targetInstance[prop] = depInstance;
        }
    });
    Constants_1.IOC.set(target, targetInstance);
    return targetInstance;
}
function Bootstrap(target) {
    const loader = new Loader(path.join(process.cwd(), './test'));
    loader.loadDirectory();
    setTimeout(() => {
        let cls = loader.applicationContext.get('App');
        console.log(cls.runTest());
    }, 2000);
}
exports.Bootstrap = Bootstrap;
function buildLoadDir(baseDir, dir) {
    if (!path.isAbsolute(dir)) {
        return path.join(baseDir, dir);
    }
    return dir;
}
class Loader {
    constructor(baseDir, preloadModules = []) {
        this.baseDir = baseDir;
        this.preloadModules = preloadModules;
        this.applicationContext = new Container_1.IOContainer(this.baseDir, undefined);
        this.applicationContext.registerObject('baseDir', this.baseDir);
    }
    loadDirectory(loadOpts = {}) {
        const baseDir = loadOpts.baseDir || this.baseDir;
        let defaultLoadDir = [];
        if (!Array.isArray(baseDir)) {
            defaultLoadDir.push(baseDir);
        }
        else {
            defaultLoadDir = baseDir;
        }
        defaultLoadDir = defaultLoadDir.map((dir) => {
            return buildLoadDir(baseDir, dir);
        });
        this.load(defaultLoadDir, loadOpts.pattern, loadOpts.ignore);
    }
    load(loadDir, pattern, ignore) {
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
                console.log(`binding file => ${JSON.stringify(Object.keys(exports))}`);
            }
        }
    }
}
//# sourceMappingURL=Bootstrap.js.map