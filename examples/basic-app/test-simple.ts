import { Bootstrap, Koatty } from "koatty";

@Bootstrap(() => {
  console.log("Bootstrap function called");
})
export class TestApp extends Koatty {
  public init() {
    console.log("Init method called");
    this.appDebug = true;
  }
}

console.log("File loaded");
