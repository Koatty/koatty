import { Koatty } from "koatty_core";

export class App extends Koatty {
  constructor(o: any) {
    super();
  };

  public init() {
    this.appDebug = true;
  }
}