import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Netlify uses the standard Next.js build and preserves server routes', async () => {
  const [config, pkg] = await Promise.all([
    readFile(new URL('../netlify.toml', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);

  assert.match(config, /command = "pnpm netlify:build"/);
  assert.match(config, /publish = "\.next"/);
  assert.match(config, /PNPM_FLAGS = "--shamefully-hoist"/);
  assert.equal(pkg.scripts['netlify:build'], 'next build');
  assert.equal(pkg.scripts['next:dev'], 'next dev');
});
