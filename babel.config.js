/*
 * @Description  : babel配置
 * @usage        : 用于jest执行用例
 * @Date         : 2020-10-19 23:08:40
 * @Author       : fankerwang<fankerwang@tencent.com>
 * @LastEditors  : fankerwang<fankerwang@tencent.com>
 * @LastEditTime : 2021-05-21 20:27:11
 * @FilePath     : /tkoatty/babel.config.js
 */

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    '@babel/preset-typescript',
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { 'legacy': true }]
  ],
};
