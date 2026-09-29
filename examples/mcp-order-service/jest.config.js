/**
 * Jest config for the F-5 reference app.
 *
 * The example lives inside the `koatty` submodule (`packages/koatty/examples/`)
 * and is NOT a root pnpm workspace project, so its dependencies are not linked
 * into a local `node_modules`. To keep the integration test runnable straight
 * from a monorepo checkout (no extra install), the Koatty packages are mapped to
 * the sibling sources/dist in `packages/`, and third-party packages are resolved
 * through `modulePaths` pointing at the node_modules of the packages that
 * already install them. Standalone use declares real dependencies (see
 * `package.json`) and does not need any of this.
 *
 * Run from the `koatty` package (jest/ts-jest live there):
 *   cd packages/koatty && npx jest --config examples/mcp-order-service/jest.config.js --coverage=false
 */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    // Only TypeScript goes through ts-jest; the mapped `dist/*.js` builds are
    // plain CommonJS and must not be compiled.
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: false }],
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
  modulePaths: [
    '<rootDir>/../../../koatty-mcp/node_modules',
    '<rootDir>/../../../koatty-trace/node_modules',
    '<rootDir>/../../../koatty-validation/node_modules',
    '<rootDir>/../../../koatty/node_modules',
  ],
  moduleNameMapper: {
    '^koatty_mcp$': '<rootDir>/../../../koatty-mcp/src/index.ts',
    '^koatty_llm$': '<rootDir>/../../../koatty-llm/src/index.ts',
    '^koatty_guard$': '<rootDir>/../../../koatty-guard/src/index.ts',
    '^koatty_trace$': '<rootDir>/../../../koatty-trace/src/index.ts',
    '^koatty_core$': '<rootDir>/../../../koatty-core/dist/index.js',
    '^koatty_validation$': '<rootDir>/../../../koatty-validation/dist/index.js',
    '^koatty_container$': '<rootDir>/../../../koatty-container/dist/index.js',
    '^koatty_lib$': '<rootDir>/../../../koatty-lib/dist/index.js',
    '^koatty_logger$': '<rootDir>/../../../koatty-logger/dist/index.js',
  },
};
