/*
 * @Description: 插件配置
 * @usage: 配置待加载的插件及加载顺序
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2023-12-05 21:12:51
 */

export default {
  list: ["TestPlugin"], //加载的插件列表,执行顺序按照数组元素顺序
  config: { //插件配置
    // ex:
    // TestPlugin: {
    //     "host": "localhost"
    // }
  }
};