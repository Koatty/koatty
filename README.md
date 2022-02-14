# koatty

Koa2 + Typescript + IOC = koatty. 

Use Typescript's decorator implement IOC and AOP.

[![Version npm](https://img.shields.io/npm/v/koatty.svg?style=flat-square)](https://www.npmjs.com/package/koatty)[![npm Downloads](https://img.shields.io/npm/dm/koatty.svg?style=flat-square)](https://npmcharts.com/compare/koatty?minimal=true)

## New features 

* HTTP、HTTPS、HTTP2、gRPC、WebSocket server.
* Support loading environment configuration, support parsing command line parameters (process. argv) and environment variables (process.env)
* `@ExceptionHandler()` Register global exception handling


## Documentation

[koatty_doc_CN](https://koatty.org/) （In progress💪）


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

Supports [typeorm](https://github.com/typeorm/typeorm). Please expand other ORM by yourself.

```shell
//typeorm
koatty middleware test

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
        try {
            const info = await this.testService.sayHello(name);
            return this.ok("success", info);
        } catch (err: Error) {
            return this.fail(err.message));
        }
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



