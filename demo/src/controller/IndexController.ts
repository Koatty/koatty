/*
 * @Description: 业务层
 * @Usage: 接收处理路由参数
 * @Author: xxx
 * @Date: 2020-12-22 15:31:17
 * @LastEditTime: 2025-02-26 18:43:13
 */

import { Output } from 'koatty_exception';
import { Valid, Validated } from "koatty_validation";
import {
  Autowired,
  Before,
  Config,
  Controller,
  Get,
  GetMapping,
  KoattyContext,
  Post, PostMapping,
  RequestBody
} from '../../../src/index';
import { App } from '../App';
import { Conf } from '../dto/conf';
import { UserDto } from '../dto/UserDto';
import { TestService } from '../service/TestService';

@Controller('/')
export class IndexController {
  app: App;
  ctx: KoattyContext;

  @Config("DataBase", "db")
  dbConf: Conf;

  @Autowired()
  protected TestService: TestService;

  /**
   * constructor
   *
   */
  constructor(ctx: KoattyContext) {
    this.ctx = ctx;
  }

  /**
   * 前置登录检查
   * AOP前置切面方法，等同于@BeforeEach()
   * @returns {*}  {Promise<any>}
   * @memberof TestController
   */
  // async __before(): Promise<any> {
  //   // 登录检查
  //   const token = this.ctx.get("x-access-token");
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
  @GetMapping('/')
  index(@RequestBody() body: any) {
    // this.ctx.session.username = "test"
    // console.log(this.dbConf.replication.slaves);
    return Output.ok("Hello, koatty!");
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
    return Output.ok("success", userInfo);
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
  @Before("TestAspect")
  async add(@Post() data: UserDto): Promise<any> {
    const userId = await this.TestService.addUser(data);
    return Output.ok('success', { userId });
  }

  /**
   * hello 接口
   *
   * @returns
   * @memberof TestController
   */
  @GetMapping('/html')
  html(): Promise<any> {
    this.ctx.state = { title: 'Koatty', content: 'Hello, Koatty!' };
    return this.ctx.render('index.html');
  }
}
