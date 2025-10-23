

export class Conf {

  "type": string;

  replication: {
    master: {
      host: "127.0.0.1",
      port: 3306,
      username: "",
      password: "",
      database: ""
    },
    slaves: [{
      host: "127.0.0.1",
      port: 3306,
      username: "",
      password: "",
      database: ""
    }]
  }
  "synchronize": boolean; //true 每次运行应用程序时实体都将与数据库同步
  "logging": boolean;
  "entities": String[];
}