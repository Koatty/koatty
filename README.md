# koatty
Koa2 + Typescript = koatty. 

Use Typescript's decorator implement IOC and AOP.

[![Version npm](https://img.shields.io/npm/v/koatty.svg?style=flat-square)](https://www.npmjs.com/package/koatty)[![npm Downloads](https://img.shields.io/npm/dm/koatty.svg?style=flat-square)](https://npmcharts.com/compare/koatty?minimal=true)


## New features
- **New:** @Scheduled("0 0/1 * * * ?") ✔️ 1.9.2
- **New:** replace koa-router to @koa/router ✔️ 1.10.0
- **New:** AOP：@Aspect()、@Before()、@After()、@BeforeEach()、@AfterEach()  ✔️ 1.11.2
- **New:** @Validated: Use class-validator for entity class validation, and support auto create Apidoc.  ✔️ 1.12.4
- **New:** SchedulerLock is redis-based distributed locks. ✔️ 1.14.8
- **New:** @Transactional() with ThinkORM. ✔️ ThinkORM@4.4.8
- **New:** think_apollo middleware supports Apollo Configuration Center. ✔️ 
- **New:** bootFunc supports asynchronous. And the appRady/appStart event also supports asynchronous  ✔️ 1.15.0
- **New:** @CacheAble, @CacheEvict supports redis-based caching  ✔️ 1.16.0
- **New:** Support asynchronous loading configuration, support plug-in ✔️ 2.5.5
- **New:** HTTP/2 ✔️ 
- **New:** koatty for etcd  ✔️
- **New:** koatty grpc server/client by think_grpc.
- **New:** koatty-cloud for trpc/Tars
- **New:** koatty-cloud for consul
- **New:** koatty-cloud for nacos
- **New:** koatty-cloud for SpringCloud
- **New:** GraphQL
- **New:** SSR 


## Documentation

[koatty_doc_CN](https://thinkkoa.github.io/koatty_doc/) （In progress💪）

[koatty_doc_EN] come soon...

## Installation

```shell
npm i -g koatty_cli
```

## Quick Start

### 1.Create Project

```shell
koatty new projectName

cd ./projectName

yarn install

npm start
```

### 2.Create a Controller
```shell
koatty controller test

```

### 3.Create a Service

```shell
koatty service test

```

### 3.Create a Middleware （Optional）

```shell
koatty middleware test

```
### 4.Create a Model（Optional）

Supports [thinkorm](https://github.com/thinkkoa/thinkorm) and [typeorm](https://github.com/typeorm/typeorm). Please expand other ORM by yourself.

```shell
//thinkorm
koatty middleware test

//typeorm
koatty middleware -o typeorm test

```

### 5.Create a DTOClass （Optional）

```shell
koatty dto test

```

### 6.Define TestController

```javascript
import { Controller, BaseController, Autowired, GetMapping, RequestBody, PathVariable, PostMapping, RequestMapping, RequestMethod, Valid } from "koatty";
import { TestDTO } from "../model/dto/TestDTO";
import { TestService } from "../service/TestService";
import { App } from "../App";

@Controller()
export class IndexController extends BaseController {
    app: App;

    @Autowired()
    private testService: TestService;

    init() {
        this.cache = {};
    }

    @RequestMapping("/", RequestMethod.ALL)
    async default(@PathVariable("test") @Valid("IsNotEmpty") test: string) {
        const info = await this.testService.sayHello().catch((err: any) => this.fail(err.message));
        return info;
    }

    @PostMapping("/test")
    @Validated() //need DTOClass
    test(@RequestBody() body: TestDTO) {
        return this.ok("test", body);
    }
}
```

## How to debug

if you use vscode , edit the `.vscode/launch.json` , like this: 
```
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "TS Program",
            "args": [
                "${workspaceRoot}/src/App.ts" 
            ],
            "runtimeArgs": [
                "--nolazy",
                "-r",
                "ts-node/register"
            ],
            "sourceMaps": true,
            "cwd": "${workspaceRoot}",
            "protocol": "inspector",
            "internalConsoleOptions": "neverOpen"
        }
    ]
}
```
Select `TS Program` to debug run. Try to call `http://localhost:3000/` .

## Example

Check out the [quick start example][quick-example].

[quick-example]: https://github.com/thinkkoa/koatty_demo/




