# koatty_config
Configuration loader for Koatty


# Usage

## 运行环境配置

`koatty_config` 可以自动识别当前运行环境，并且根据运行环境自动加载相应配置（如果存在）:

```js
const env = process.env.KOATTY_ENV || process.env.NODE_ENV || "";
```

如果 `env = production`, koatty_config 会自动加载以 `_pro.ts` 或 `_production.ts` 后缀的配置文件。

例如:

```sh
// 自动加载 config_dev.ts 或 config_development.ts
NODE_ENV=dev ts-node "test/test.ts" 
```

## 命令行参数

`koatty_config` 可以自动识别命令行参数，并且自动填充到相应的配置项:

```sh
// 自动填充config.cc.dd.ee的值
NODE_ENV=dev ts-node "test/test.ts" --config.cc.dd.ee=77

```

## 占位符变量替换

`koatty_config` 可以自动将配置文件中使用 `${}` 占位符标识的配置项替换为process.env内的同名项的值:

config.ts
```js
export default {
    ...
    ff: "${ff_value}"
    ...
}
```

```sh
// 自动填充ff的值
NODE_ENV=dev ff_value=999 ts-node "test/test.ts"

```