/*
 * @Description: 中间件配置
 * @usage: 配置待加载的中间件及加载顺序, 中间件在middleware目录下引入
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2023-12-15 00:29:31
 */

export default {
  list: [], //加载的中间件列表
  config: { //中间件配置
    // 静态服务器中间件默认未开启
    // StaticMiddleware: false,
    // 需要开启请修改为:
    StaticMiddleware: {
      cache: true
    },

    SessionMiddleware: {
      key: 'koa.sess', /** (string) cookie key (default is koa.sess) */
      /** (number || 'session') maxAge in ms (default is 1 days) */
      /** 'session' will result in a cookie that expires when session/browser is closed */
      /** Warning: If a session cookie is stolen, this cookie will never expire */
      maxAge: 86400000,
      autoCommit: true, /** (boolean) automatically commit headers (default true) */
      overwrite: true, /** (boolean) can overwrite or not (default true) */
      httpOnly: true, /** (boolean) httpOnly or not (default true) */
      signed: false, /** (boolean) signed or not (default true) */
      rolling: false, /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */
      renew: false, /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/
      secure: false, /** (boolean) secure cookie*/
      sameSite: null, /** (string) session cookie sameSite options (default null, don't set it) */
    }
  }
};