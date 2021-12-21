/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-17 10:20:44
 * @LastEditTime: 2021-12-18 11:58:46
 */
import json from "@rollup/plugin-json";
import typescript from 'rollup-plugin-typescript2';
// import babel from '@rollup/plugin-babel';

export default [
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
]