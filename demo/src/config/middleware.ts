/*
 * @Description: 中间件配置
 * @usage: 配置待加载的中间件及加载顺序, 中间件在middleware目录下引入
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2022-03-15 14:23:56
 */

export default {
  list: ["StaticMiddleware"], //加载的中间件列表
  config: { //中间件配置
    // 静态服务器中间件默认未开启
    StaticMiddleware: false,
    // 需要开启请修改为:
    // StaticMiddleware: {
    //     cache: true
    // },
  }
};