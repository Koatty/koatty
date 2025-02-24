# koatty

Koa2 + Typescript + IOC = koatty. 

Use Typescript's decorator implement IOC and AOP.

[![Version npm](https://img.shields.io/npm/v/koatty.svg?style=flat-square)](https://www.npmjs.com/package/koatty)[![npm Downloads](https://img.shields.io/npm/dm/koatty.svg?style=flat-square)](https://npmcharts.com/compare/koatty?minimal=true)

## New features 

* HTTP、HTTPS、HTTP2、gRPC、WebSocket server.✔️
* Support loading environment configuration, parsing command line parameters (process.argv) and environment variables (process.env).✔️
* `@ExceptionHandler()` Register global exception handling.✔️
* graceful shutdown and pre-exit event.✔️
* custom decorator based on app events.✔️
* GraphQL supporting. 💪
* OpenTelemetry . 💪


## Documentation

[CN](https://koatty.org/) 
[EN](https://github.com/Koatty/koatty_doc/blob/master/docs/README-en.md)

## Installation CLI tools

```shell
npm i -g koatty_cli
```

## Quick Start

### 1.Create Project

```shell
kt new projectName

```

### 2. Install deps

```
cd ./projectName

npm i
```

### 3. Start up

```
npm run dev

// or
npm start
```

## Code style

default Controller:

```javascript
import { Controller, Autowired, GetMapping, RequestBody, PathVariable,
 PostMapping, RequestMapping, RequestMethod, Valid, Output } from "koatty";
import { TestDTO } from "../model/dto/TestDTO";
import { TestService } from "../service/TestService";
import { App } from "../App";

@Controller()
export class IndexController {
    app: App;
    ctx: KoattyContext;

    @Autowired()
    private testService: TestService;

    /**
     * constructor
     *
     */
    constructor(ctx: KoattyContext) {
        this.ctx = ctx;
    }

    @GetMapping('/')
    index() {
        return Output.ok("Hello, koatty!");
    }

    @RequestMapping("/:name", RequestMethod.ALL)
    async default(@PathVariable("name") @Valid("IsNotEmpty") name: string) {
        try {
            const info = await this.testService.sayHello(name);
            return Output.ok(this.ctx, "success", info);
        } catch (err: Error) {
            return Output.fail(this.ctx, err.message));
        }
    }

    @PostMapping("/test")
    @Validated() //need DTOClass
    test(@RequestParam() params: TestDTO) {
        return Output.ok(this.ctx, "test", params);
    }
}
```

## How to do Unit Testing

>only support `jest` UT framework now 

```javascript
import request from 'supertest';
import { ExecBootStrap } from 'koatty';
import { App } from '../src/App';

describe('UT example', () => {

  let app: KoattyApplication;
  beforeAll(async () => {
    jest.useFakeTimers();
    // test env
    process.env.KOATTY_ENV = 'ts-node';
    app = await ExecBootStrap()(App);
    // app.use(async (ctx: any) => {
    //   ctx.body = 'Hello, World!';
    // });
  });

  afterAll(done => {
    done();
    jest.clearAllMocks();
  });

  it('request', async () => {
    const res = await request(app.callback()).get('/');
    expect(res.status).toBe(200);
  });
});

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
            "outputCapture": "std",
            "internalConsoleOptions": "neverOpen"
        }
    ]
}
```
Select `TS Program` to debug run. Try to call `http://localhost:3000/` .

## Example

Check out the [quick start example][quick-example].

[quick-example]: https://github.com/Koatty/koatty_template



