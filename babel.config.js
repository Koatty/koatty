/*
 * @Description  : babel配置
 * @usage        : 用于jest执行用例
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
