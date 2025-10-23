/**
 * 
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
    "@typescript-eslint/no-require-imports": "warn",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/member-ordering": "off",
    "@typescript-eslint/consistent-type-assertions": "off",
    "@typescript-eslint/no-param-reassign": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-empty-interface": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unsafe-function-type": "warn",
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        vars: 'all', // 检查所有变量
        varsIgnorePattern: '^_', // 允许以 _ 开头的变量
        args: 'after-used', // 仅检查被使用的参数
        argsIgnorePattern: '^_', // 允许以 _ 开头的参数
      }
    ],
  },
};
