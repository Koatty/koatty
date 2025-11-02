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
// import babel from '@rollup/plugin-babel';
import terser from "@rollup/plugin-terser";
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
            module: "ESNext",
            skipLibCheck: true,
            // 不使用 paths，让 TypeScript 使用 node_modules 中的类型
            // 这样可以避免类型冲突
          }
        },
        // 使用 cache 来提高性能
        useTsconfigDeclarationDir: false,
        // 忽略类型错误，只做转译
        check: false
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
      ...builtinModules, // 排除 Node.js 内置模块
      ...Object.keys(pkg.dependencies || {}), // 排除 package.json 中的外部依赖
      ...Object.keys(pkg.devDependencies || {}),
    ],
  },

]
