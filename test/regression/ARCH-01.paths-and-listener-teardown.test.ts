/**
 * ARCH-01 / D-1 regression tests (steps 5 and 6).
 *
 * Step 5: `Loader.initialize` publishes a canonical `app.paths` record and the
 *         deprecated `process.env.ROOT_PATH` family stays populated for
 *         backward compatibility (removal scheduled for 5.0).
 * Step 6: the process-level listeners registered by `captureError()` are
 *         detached on `app.stop()`, so a stopped application stops observing
 *         process events.
 *
 * @ license: BSD (3-Clause)
 */
import { Koatty } from 'koatty_core';
import { Loader } from '../../src/core/Loader';

describe('ARCH-01: application path record and listener teardown', () => {
  test('initialize publishes app.paths alongside the legacy env vars', () => {
    const app = new (class extends Koatty { })();

    Loader.initialize(app as any);

    expect(app.paths).toBeDefined();
    expect(app.paths!.rootPath).toBe(app.rootPath);
    expect(app.paths!.appPath).toBe(app.appPath);
    expect(app.paths!.koattyPath).toBe(app.koattyPath);

    // Backward-compatible env writes are still present (deprecated, removed in 5.0).
    expect(process.env.ROOT_PATH).toBe(app.rootPath);
    expect(process.env.APP_PATH).toBe(app.appPath);
  });

  test('captureError registers process listeners that stop() detaches', async () => {
    const app = new (class extends Koatty { })();
    Loader.initialize(app as any);

    // captureError() may already have run during construction; reset the guard
    // so this test observes a clean register/detach cycle.
    (app as any)._errorCaptured = false;
    (app as any).releaseErrorListeners?.();

    // The process listener list is process-global and shared with other suites,
    // so assert on this app's own tracked handlers rather than raw counts.
    (app as any).captureError();
    const tracked = (app as any)._processErrorListeners as Array<{ event: string; handler: Function }>;
    expect(tracked.length).toBe(3);
    for (const { event, handler } of tracked) {
      expect(process.listeners(event)).toContain(handler);
    }

    await app.stop();

    expect((app as any)._processErrorListeners.length).toBe(0);
    // `warning` uses the shared Logger.Warn reference, which other registrations
    // in the process may also hold, so only assert the app-owned handlers are
    // gone for the events with private handler functions.
    for (const { event, handler } of tracked) {
      if (event === 'warning') continue;
      expect(process.listeners(event)).not.toContain(handler);
    }
  });

  test('stop() is idempotent with respect to listener teardown', async () => {
    const app = new (class extends Koatty { })();
    (app as any)._errorCaptured = false;
    (app as any).captureError();
    await app.stop();
    expect((app as any)._processErrorListeners.length).toBe(0);
    await app.stop();
    expect((app as any)._processErrorListeners.length).toBe(0);
  });
});
