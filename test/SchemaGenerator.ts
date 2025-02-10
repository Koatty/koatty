import 'reflect-metadata';

// 装饰器工厂函数
export function ObjectType() {
  return function (target: Function) {
    Reflect.defineMetadata('type', 'object', target);
  };
}

export function Field(typeFunction?: () => any) {
  return function (target: any, propertyKey: string) {
    const reflectedType = Reflect.getMetadata('design:type', target, propertyKey);
    let type = typeFunction ? typeFunction() : reflectedType;
    Reflect.defineMetadata("fieldType", type, target, propertyKey);

    const fields = Reflect.getMetadata('fields', target.constructor) || [];
    if (!fields.includes(propertyKey)) {
      fields.push(propertyKey);
    }
    Reflect.defineMetadata('fields', fields, target.constructor);
  };
}

export function InputType() {
  return function (target: Function) {
    Reflect.defineMetadata('type', 'input', target);
  };
}

export class SchemaGenerator {
  private types: Map<string, Function> = new Map();

  registerType(type: Function) {
    this.types.set(type.name, type);
  }

  generateSchema(): string {
    let schema = '';

    this.types.forEach((type) => {
      const typeKind = Reflect.getMetadata('type', type);
      if (typeKind === 'object') {
        schema += this.generateObjectType(type);
      } else if (typeKind === 'input') {
        schema += this.generateInputType(type);
      }
    });

    return schema;
  }

  private generateObjectType(type: Function): string {
    let fields = '';
    const fieldsList: string[] = Reflect.getMetadata('fields', type) || [];
    for (const propertyKey of fieldsList) {
      const fieldType = Reflect.getMetadata('fieldType', type.prototype, propertyKey);
      fields += `  ${propertyKey}: ${this.getGraphQLType(fieldType)}\n`;
    }
    return `type ${type.name} {\n${fields}}\n\n`;
  }

  private generateInputType(type: Function): string {
    let fields = '';
    const fieldsList: string[] = Reflect.getMetadata('fields', type) || [];
    for (const propertyKey of fieldsList) {
      const fieldType = Reflect.getMetadata('type', type.prototype, propertyKey);
      fields += `  ${propertyKey}: ${this.getGraphQLType(fieldType)}\n`;
    }
    return `input ${type.name} {\n${fields}}\n\n`;
  }

  private getGraphQLType(type: any): string {
    // 处理数组类型
    if (Array.isArray(type)) {
      const itemType = this.getGraphQLType(type[0]);
      return `[${itemType}]`;
    }

    // 处理基本类型和自定义类型
    return this.mapType(type);
  }

  private mapType(types: any): string {
    if (types === String) return 'String';
    if (types === Number) return 'Float';
    if (types === Boolean) return 'Boolean';
    if (types === Date) return 'DateTime';
    // 如果类型是函数，先执行它
    if (typeof types === 'function') {
      if (this.types.has(types.name)) {
        return types.name;
      } else {
        // 如果是普通函数，执行它并递归处理返回值
        const resolvedType = types();
        return this.getGraphQLType(resolvedType);
      }
    }
    return 'String'; // 默认类型
  }

}