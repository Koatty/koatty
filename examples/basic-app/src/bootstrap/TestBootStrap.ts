/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-11-08 15:12:06
 * @LastEditTime: 2026-01-30 10:17:00
 */
import { Component, OnEvent, Logger, KoattyApplication, AppEvent } from "../../../../src";

/**
 * Test Bootstrap Component
 * Use @Component and @OnEvent decorators to bind lifecycle hooks
 */
@Component("TestBootStrap", { scope: 'core', priority: 100 })
export class TestBootStrap {
  @OnEvent(AppEvent.appBoot)
  async onBoot(app: KoattyApplication): Promise<void> {
    Logger.Debug("TestBootStrap - appBoot event triggered");
    return Promise.resolve();
  }
}

