/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-17 10:20:44
 * @LastEditTime: 2024-11-04 22:04:45
 */
import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json";
import resolve from '@rollup/plugin-node-resolve';
import { builtinModules } from 'module';
import del from "rollup-plugin-delete";
import typescript from 'rollup-plugin-typescript2';
// import babel from '@rollup/plugin-babel';
const pkg = require('./package.json');

export default [
  {
    input: './src/index.ts',
    output: [
      {
        format: 'cjs',
        file: './dist/index.js',
        banner: require('./scripts/copyright'),
      },
      {
        format: 'es',
        file: './dist/index.mjs',
        banner: require('./scripts/copyright'),
      },
    ],
    plugins: [
      del({ targets: ["dist/*", "temp/*", "docs/api"] }),
      // babel({
      //     babelHelpers: "runtime",
      //     configFile: './babel.config.js',
      //     exclude: 'node_modules/**',
      // }),
      json(),
      resolve({
        preferBuiltins: true, // 优先选择内置模块
      }),
      commonjs(),
      typescript({
        tsconfigOverride: {
          compilerOptions: {
            declaration: false,
            declarationMap: false,
            module: "ESNext"
          }
        }
      })
    ],
    external: [
      ...builtinModules, // 排除 Node.js 内置模块
      ...Object.keys(pkg.dependencies || {}), // 排除 package.json 中的外部依赖
    ],
  },

]