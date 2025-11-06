'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var commonjs = require('@rollup/plugin-commonjs');
var json = require('@rollup/plugin-json');
var resolve = require('@rollup/plugin-node-resolve');
var module$1 = require('module');
var del = require('rollup-plugin-delete');
var typescript = require('rollup-plugin-typescript2');
var terser = require('@rollup/plugin-terser');

/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2024-11-07 11:22:26
 * @LastEditTime: 2025-04-02 15:05:36
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
const pkg = require('./package.json');

var _rollup_config = [
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
      }
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
      terser({
        compress: {
          defaults: false,   // 改为 `false`（新版本默认启用所有优化）
          arrows: true,      // 保留箭头函数转换
          booleans: true,    // 保留布尔简化
          drop_console: false, // 保留 console
          keep_fnames: true  // 保留函数名
        },
        mangle: {
          reserved: ['$super'], // 保留关键字
          keep_classnames: true // 保留类名
        },
        format: {
          beautify: true,    // 启用格式化
          indent_level: 2,    // 缩进层级
          comments: /@Author|@License|@Copyright/ // 保留特定注释  
        }
      })
    ],
    external: [
      ...module$1.builtinModules, // 排除 Node.js 内置模块
      ...Object.keys(pkg.dependencies || {}), // 排除 package.json 中的外部依赖
      ...Object.keys(pkg.devDependencies || {}),
    ],
  },

];

exports.default = _rollup_config;
