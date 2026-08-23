import assert from 'node:assert/strict';
import test from 'node:test';

test('brand configuration keeps the working name in one replaceable module', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../app/brand.ts', import.meta.url), 'utf8'));
  assert.match(source, /NEXT_PUBLIC_BRAND_PRIMARY/);
  assert.match(source, /NEXT_PUBLIC_BRAND_ACCENT/);
  assert.match(source, /name:\s*`\$\{primary\}\$\{accent\}`/);
});
