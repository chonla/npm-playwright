import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

// Resolves through the package's own `exports` map (Node self-reference), exactly like a consumer would.
const requireFromPackage = createRequire(__filename);

test('main entry exports the decorators', () => {
  const pkg = requireFromPackage('@chonla/playwright');
  expect(typeof pkg.step).toBe('function');
  expect(typeof pkg.PageWith).toBe('function');
});

test('package.json is importable for tools that read version and peer dependencies', () => {
  const manifest = requireFromPackage('@chonla/playwright/package.json');
  expect(manifest.name).toBe('@chonla/playwright');
  expect(manifest.peerDependencies['@playwright/test']).toBeTruthy();
});

test('internal modules stay private', () => {
  expect(() => requireFromPackage('@chonla/playwright/dist/label')).toThrow(/ERR_PACKAGE_PATH_NOT_EXPORTED|not defined by "exports"/);
});
