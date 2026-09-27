/**
 * COR-02 regression test: bootstrap failures must propagate to the caller.
 *
 * - ExecBootStrap rethrows when the application fails to initialize, instead
 *   of swallowing the error in Logger.Fatal (which exits the process and
 *   previously left the rejected promise unobservable).
 *
 * @ license: BSD (3-Clause)
 */
import { ExecBootStrap, createApplication } from '../../src/index';
import { Koatty } from 'koatty_core';

describe('COR-02: bootstrap failure propagates', () => {
  test('ExecBootStrap rejects when bootFunc fails', async () => {
    class Cor02App extends Koatty { }

    await expect(
      ExecBootStrap(() => {
        throw new Error('boom during bootFunc');
      })(Cor02App)
    ).rejects.toThrow('boom during bootFunc');
  });

  test('createApplication rejects when bootFunc fails', async () => {
    class Cor02App2 extends Koatty { }

    await expect(
      createApplication(Cor02App2, () => {
        throw new Error('boom via createApplication');
      })
    ).rejects.toThrow('boom via createApplication');
  });

  test('createApplication rejects when the target does not inherit Koatty', async () => {
    class NotKoatty { }

    await expect(createApplication(NotKoatty as any)).rejects.toThrow(/does not inherit from Koatty/);
  });
});
