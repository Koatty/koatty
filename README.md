# koatty

Koa2 + Typescript + IOC = koatty. 

Use Typescript's decorator implement IOC and AOP.

[![Version npm](https://img.shields.io/npm/v/koatty.svg?style=flat-square)](https://www.npmjs.com/package/koatty)[![npm Downloads](https://img.shields.io/npm/dm/koatty.svg?style=flat-square)](https://npmcharts.com/compare/koatty?minimal=true)

## New features 

* HTTP、HTTPS、HTTP2 .
* gRPC  server. 
* WebSocket server. (unstable)


## Documentation

[koatty_doc_CN](https://koatty.github.io/koatty_doc/) （In progress💪）

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

    @RequestMapping("/:name", RequestMethod.ALL)
    async default(@PathVariable("name") @Valid("IsNotEmpty") name: string) {
        const info = await this.testService.sayHello(name).catch((err: any) => this.fail(err.message));
        return info;
    }

    @PostMapping("/test")
    @Validated() //need DTOClass
    test(@RequestParam() params: TestDTO) {
        return this.ok("test", params);
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



