'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var json = require('@rollup/plugin-json');
var typescript = require('rollup-plugin-typescript2');

/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-17 10:20:44
 * @LastEditTime: 2022-05-27 11:50:23
 */
// import babel from '@rollup/plugin-babel';

var _rollup_config = [
    {
        input: './src/index.ts',
        output: [{
            format: 'cjs',
            file: './dist/index.js',
            banner: require('./scripts/copyright')
        }],
        plugins: [
            // babel({
            //     babelHelpers: "runtime",
            //     configFile: './babel.config.js',
            //     exclude: 'node_modules/**',
            // }),
            json(),
            typescript({
                tsconfigOverride: {
                    compilerOptions: {
                        declaration: false,
                        declarationMap: false,
                        module: "ESNext"
                    }
                }
            })
        ]
    },
    {
        input: './src/index.ts',
        output: [{
            format: 'es',
            file: './dist/index.mjs',
            banner: require('./scripts/copyright')
        }],
        plugins: [
            // babel({
            //     babelHelpers: "runtime",
            //     configFile: './babel.config.js',
            //     exclude: 'node_modules/**',
            // }),
            json(),
            typescript({
                tsconfigOverride: {
                    compilerOptions: {
                        declaration: false,
                        declarationMap: false,
                        module: "ESNext"
                    }
                }
            })
        ]
    }
];

exports.default = _rollup_config;
