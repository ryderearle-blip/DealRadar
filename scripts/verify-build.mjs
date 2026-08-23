import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const requiredFiles = [
  'dist/server/index.js',
  'dist/client/favicon.svg',
  'dist/client/og.png',
  'dist/.openai/hosting.json',
];

await Promise.all(requiredFiles.map(file => access(resolve(projectRoot, file))));

const hosting = JSON.parse(await readFile(resolve(projectRoot, 'dist/.openai/hosting.json'), 'utf8'));
const allowedHostingKeys = new Set(['project_id', 'd1', 'r2']);
assert.equal(typeof hosting.project_id, 'string', 'Built hosting metadata must include a project id');
assert.deepEqual(Object.keys(hosting).filter(key => !allowedHostingKeys.has(key)), [], 'Built hosting metadata contains unsupported keys');

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  }));
  return files.flat();
}

const clientFiles = await filesBelow(resolve(projectRoot, 'dist/client'));
assert.equal(clientFiles.some(file => /(^|[\\/])\.env/i.test(file)), false, 'Environment files must not be included in client output');
const clientJavaScript = clientFiles.filter(file => file.endsWith('.js'));
for (const file of clientJavaScript) {
  const contents = await readFile(file, 'utf8');
  assert.doesNotMatch(contents, /BEST_BUY_API_KEY|AMAZON_CREATORS_CREDENTIAL_SECRET|WALMART_CLIENT_SECRET/, `Server credential name leaked into ${file}`);
}

console.log(`Verified staging artifact: ${requiredFiles.length} required files, ${clientFiles.length} client files, no retailer secret names.`);
