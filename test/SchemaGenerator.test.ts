import 'reflect-metadata';
import { Field, InputType, ObjectType, SchemaGenerator } from './SchemaGenerator'; // 假设你的原始代码在这个文件中

// 定义测试用的类
@ObjectType()
class User {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  age: number;

  @Field()
  createdAt: Date;

  @Field(() => [String])
  roles: string[];
}

@InputType()
class CreateUserInput {
  @Field()
  name: string;

  @Field()
  age: number;
}

@ObjectType()
class Post {
  @Field()
  id: string;

  @Field()
  title: string;

  @Field(() => User)
  author: User;
}

describe('SchemaGenerator', () => {
  let generator: SchemaGenerator;

  beforeEach(() => {
    generator = new SchemaGenerator();
    generator.registerType(User);
    generator.registerType(CreateUserInput);
    generator.registerType(Post);
  });

  test('generates correct schema for User type', () => {
    const schema = generator.generateSchema();
    console.log(schema);
    expect(schema).toContain('type User {');
    expect(schema).toContain('id: String');
    expect(schema).toContain('name: String');
    expect(schema).toContain('age: Float');
    expect(schema).toContain('createdAt: DateTime');
    expect(schema).toContain('roles: [String]');
  });

  test('generates correct schema for CreateUserInput type', () => {
    const schema = generator.generateSchema();
    expect(schema).toContain('input CreateUserInput {');
    expect(schema).toContain('name: String');
    expect(schema).toContain('age: Float');
  });

  test('generates correct schema for Post type with nested User', () => {
    const schema = generator.generateSchema();
    expect(schema).toContain('type Post {');
    expect(schema).toContain('id: String');
    expect(schema).toContain('title: String');
    expect(schema).toContain('author: User');
  });

  test('correctly differentiates between object and input types', () => {
    const schema = generator.generateSchema();
    expect(schema).toContain('type User {');
    expect(schema).toContain('input CreateUserInput {');
  });

  test('handles array types correctly', () => {
    const schema = generator.generateSchema();
    expect(schema).toContain('roles: [String]');
  });

  test('maps Date to DateTime', () => {
    const schema = generator.generateSchema();
    expect(schema).toContain('createdAt: DateTime');
  });
});