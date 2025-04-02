/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2024-11-07 11:22:26
 * @LastEditTime: 2025-04-02 15:05:36
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import commonjs from '@rollup/plugin-commonjs';
import json from "@rollup/plugin-json";
import resolve from '@rollup/plugin-node-resolve';
import { builtinModules } from 'module';
import del from "rollup-plugin-delete";
import typescript from 'rollup-plugin-typescript2';
import cleanup from 'rollup-plugin-cleanup';
// import babel from '@rollup/plugin-babel';
// import { terser } from "@rollup/plugin-terser";
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
      }),
      // terser(),
      cleanup({ comments: "istanbul", extensions: ["js", "ts"] }),
    ],
    external: [
      ...builtinModules, // 排除 Node.js 内置模块
      ...Object.keys(pkg.dependencies || {}), // 排除 package.json 中的外部依赖
      ...Object.keys(pkg.devDependencies || {}),
    ],
  },

]