/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-11-08 15:25:22
 * @LastEditTime: 2023-12-11 05:17:55
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:@typescript-eslint/recommended', // 使用@typescript-eslint/eslint-plugin的推荐规则
    'plugin:jest/recommended',
  ],
  plugins: [
    '@typescript-eslint',
    'jest',
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
  env: {
    node: true,
    mongo: true,
    jest: true,
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    // "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/member-ordering": "off",
    "@typescript-eslint/consistent-type-assertions": "off",
    "@typescript-eslint/no-param-reassign": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/ban-types": ["error",
      {
        "types": {
          "Object": false,
          "Function": false,
        },
        "extendDefaults": true
      }
    ],
  },
};
