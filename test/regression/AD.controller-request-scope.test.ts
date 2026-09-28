import { Koatty, Controller, Service } from 'koatty_core';
import { Container, Autowired } from 'koatty_container';
import { Loader } from '../../src/core/Loader';

@Service(undefined, { scope: 'Request' })
class RequestService {}
@Controller('/')
class RequestController { @Autowired(RequestService, 'SERVICE') service: RequestService; }
class TestLoader extends Loader {
  async register() { await this.LoadServices(); await this.LoadControllers(); }
}

test('loader registers request dependencies without constructing a controller at startup', async () => {
  const app = new (class extends Koatty {})(); app.container = new Container(); app.container.setApp(app as any);
  app.container.saveClass('SERVICE', RequestService, 'RequestService');
  app.container.saveClass('CONTROLLER', RequestController, 'RequestController');
  await new TestLoader(app).register();
  const c = app.container as Container;
  await c.runInRequestScope({}, async () => {
    const ctl = c.get<RequestController>('RequestController', 'CONTROLLER');
    expect(ctl.service).toBe(c.get('RequestService', 'SERVICE'));
  });
  await c.clear();
});

import ts from 'typescript';
import {PostConstruct,PreDestroy} from 'koatty_container';
test.each([true,false])('compiled Service/Controller request lifecycle and injection (Legacy=%s)', async legacy => {
  const source = `
    @Service(undefined,{scope:'Request'}) export class MatrixRequestService {
      initialized=0; destroyed=0;
      @PostConstruct() async init(){await Promise.resolve();this.initialized++;}
      @PreDestroy() dispose(){this.destroyed++;}
    }
    @Controller('/') export class MatrixRequestController {
      @Autowired(MatrixRequestService,'SERVICE') service;
    }
  `;
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:legacy},reportDiagnostics:true});
  expect(output.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)).toEqual([]);
  const exports:any={};new Function('exports','Service','Controller','Autowired','PostConstruct','PreDestroy',output.outputText)(exports,Service,Controller,Autowired,PostConstruct,PreDestroy);
  const app=new(class extends Koatty {})();app.container=new Container();app.container.setApp(app as any);
  const c=app.container as Container;
  c.saveClass('SERVICE',exports.MatrixRequestService,'MatrixRequestService');
  c.saveClass('CONTROLLER',exports.MatrixRequestController,'MatrixRequestController');
  try {
    await new TestLoader(app).register();
    expect(()=>c.get('MatrixRequestService','SERVICE')).toThrow(/active request/);
    const instances=await Promise.all([{},{}].map(async ctx=>{
      let instance:any;
      await c.runInRequestScope(ctx,async()=>{
        instance=(c.get('MatrixRequestController','CONTROLLER') as any).service;
        await c.readyRequestScope(ctx);await Promise.resolve();
        expect(c.get('MatrixRequestService','SERVICE')).toBe(instance);expect(instance.initialized).toBe(1);
      });
      await c.releaseRequestScope(ctx);expect(instance.destroyed).toBe(1);return instance;
    }));
    expect(instances[0]).not.toBe(instances[1]);
  }finally{await c.clear();}
});
