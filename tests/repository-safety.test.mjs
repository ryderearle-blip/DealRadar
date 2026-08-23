import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('retailer credentials remain server-only by convention and source boundary', async () => {
  const [environmentExample, clientPage, gitignore] = await Promise.all([
    readFile(new URL('../.env.example', import.meta.url), 'utf8'),
    readFile(new URL('../app/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../.gitignore', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(environmentExample, /NEXT_PUBLIC_(BEST_BUY|AMAZON|WALMART)/);
  assert.doesNotMatch(clientPage, /process\.env\.(BEST_BUY|AMAZON|WALMART)/);
  assert.match(gitignore, /^\.env\*/m);
  assert.match(environmentExample, /^BEST_BUY_API_KEY=/m);
});
