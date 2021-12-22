/*
 * @Description: 业务层
 * @Usage: 接收处理路由参数
 * @Author: xxx
 * @Date: 2020-12-22 15:31:17
 * @LastEditTime: 2021-12-23 01:04:46
 */

import { Controller, Autowired, GetMapping, Post, PostMapping, KoattyContext, Before, HttpController, Get } from '../../../src/index';
import { Valid, Validated } from "koatty_validation";
import { App } from '../App';
import { TestAspect } from '../aspect/TestAspect';
import { UserDto } from '../dto/UserDto';
import { TestService } from '../service/TestService';

@Controller('/')
export class IndexController extends HttpController {
  app: App;
  ctx: KoattyContext;

  @Autowired()
  protected TestService: TestService;

  /**
   * 前置登录检查
   * AOP前置切面方法，等同于@BeforeEach()
   * @returns {*}  {Promise<any>}
   * @memberof TestController
   */
  // async __before(): Promise<any> {
  //   // 登录检查
  //   const token = this.header("x-access-token");
  //   const isLogin = await this.TestService.checkLogin(token);
  //   if (isLogin) {
  //     this.ctx.userId = `${Date.now()}_${String(Math.random()).substring(2)}`;
  //   } else {
  //     return this.fail('no login', { needLogin: 1 });
  //   }
  // }

  /**
   * @api {get} / index接口
   * @apiGroup Test
   * 
   * 
   * @apiSuccessExample {json} Success
   * {"code":1,"message":"","data":{}}
   * 
   * @apiErrorExample {json} Error
   * {"code":0,"message":"错误信息","data":null}
   */
  @GetMapping()
  index() {
    this.ctx.status = 200;
    return 'Hi Koatty';
  }

  /**
   * @api {get} /get get接口
   * @apiGroup Test
   * 
   * @apiParam {number} id  userId.
   * 
   * @apiSuccessExample {json} Success
   * {"code":1,"message":"","data":{}}
   * 
   * @apiErrorExample {json} Error
   * {"code":0,"message":"错误信息","data":null}
   */
  @GetMapping("/get")
  async get(@Valid("IsNotEmpty", "id不能为空") @Get("id") id: number): Promise<any> {
    const userInfo = await this.TestService.getUser(id);
    return this.ok("success", userInfo);
  }

  /**
   * @api {post} /add add接口
   * @apiGroup Test
   * 
   * @apiParamClass (src/dto/UserDto.ts) {RoleDTO}
   * 
   * @apiSuccessExample {json} Success
   * {"code":1,"message":"","data":{}}
   * 
   * @apiErrorExample {json} Error
   * {"code":0,"message":"错误信息","data":null}
   */
  @PostMapping('/add')
  @Validated()
  @Before(TestAspect)
  async add(@Post() data: UserDto): Promise<any> {
    const userId = await this.TestService.addUser(data);
    return this.ok('success', { userId });
  }
}
