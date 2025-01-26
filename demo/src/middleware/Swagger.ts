
const DEFINITIONS: any = {};
const SWAGGER_ROUTER = new WeakMap();
const PATHS: any = {}
let PARAMETERS: any[] = [];
let RESPONSES: any = {};
let DEFINITION: any = {};

export function Definition() {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    DEFINITIONS[constructor] = {
      name: constructor.name,
      type: "object",
      ...DEFINITION
    };
    DEFINITION = {};
  }
}

function toSwaggerRef(ref: any) {
  if (ref.charAt) return ref;
  const definition = DEFINITIONS[ref];
  return `#/definitions/${definition.name}`;
}

export interface ApiPropertyProps {
  required?: boolean
  type: string
  example?: string
  items?: { $ref?: any }
}

export function ApiProperty(props: ApiPropertyProps) {
  return function (_target: any, propertyKey: string) {
    if (!DEFINITION.required) DEFINITION.required = [];
    if (!DEFINITION.properties) DEFINITION.properties = {};

    if (props.required) DEFINITION.required.push(propertyKey);
    if (props.items?.$ref) props.items.$ref = toSwaggerRef(props.items.$ref);

    DEFINITION.properties = { ...DEFINITION.properties, [propertyKey]: props };
  }
}

function getDefinitions(): any {
  return Object.values(DEFINITIONS).reduce(
    function (acc: any, cur: any) {
      return { ...acc, [cur.name]: cur }
    },
    {}
  );
}

type Methods = 'get' | 'post' | 'patch' | 'put' | 'delete';

export interface ApiOperationProps {
  method: Methods,
  path: string,
  summary?: string,
  description?: string,
  tags?: string[],
}

export function ApiOperation(props: ApiOperationProps) {
  const swaggerPath = props.path.split('/')
    .map(token => {
      if (!token.startsWith(':')) return token;
      return `{${token.slice(1)}}`;
    })
    .join('/');

  PATHS[swaggerPath] = {
    [props.method]: {
      summary: props.summary,
      description: props.description,
      tags: props.tags,
      parameters: PARAMETERS,
      responses: RESPONSES
    }
  }
  PARAMETERS = [];
  RESPONSES = {};

  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    const info: any[] = SWAGGER_ROUTER.get(target) || [];
    info.push({
      path: props.path,
      method: props.method,
      propertyKey
    });
    SWAGGER_ROUTER.set(target, info);
  }
}

export interface ParameterProps {
  in: "path" | "body",
  name?: string,
  schema?: { $ref?: any },
  required?: boolean
}

export function ApiParameter(props: ParameterProps) {
  let { schema, ...rest } = props;

  if (schema?.$ref) {
    schema.$ref = toSwaggerRef(schema.$ref);
  }

  PARAMETERS.push({
    ...rest,
    schema
  });

  return (_target: any, _propertyKey: string, _descriptor: PropertyDescriptor) => { }
}

export interface ResponseProps {
  status: number,
  type: string,
  schema?: { $ref: any }
}

export function ApiResponse(props: ResponseProps) {
  let { schema, status, type } = props;

  if (schema?.$ref) {
    schema.$ref = toSwaggerRef(schema.$ref);
  }

  if (!RESPONSES[status]) RESPONSES[status] = { content: {} };
  RESPONSES[status].content = {
    [type]: {
      schema
    }
  }

  return (_target: any, _propertyKey: string, _descriptor: PropertyDescriptor) => { }
}

export interface SwaggerProps {
  "openapi"?: string,
  "info"?: {
    "title": string,
    "description"?: string,
    "termsOfService"?: string,
    "contact"?: {
      "email": string
    },
    "license"?: {
      "name": string,
      "url": string
    },
    "version"?: string,
  },
  "servers"?: {
    url?: string,
  },
  "tags"?: string[],
  "paths"?: any
}

export function swaggerDoc(props: SwaggerProps) {
  const definitions = getDefinitions();

  const res: any = {
    title: props.info?.title,
    info: props.info,
    paths: PATHS,
    definitions,
    // responses: {},
    // parameters: {},
    // securityDefinitions: {},
    // tags: [],
    // routePrefix: '/swagger',
    swaggerOptions: {
      spec: props
    }
  };
  return res;
}