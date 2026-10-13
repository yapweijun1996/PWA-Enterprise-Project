import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function worker(scope = 'https://example.test/demo/') {
  const handlers = {};
  const network = [];
  const self = {
    registration: { scope }, location: { origin: new URL(scope).origin },
    addEventListener: (name, callback) => { handlers[name] = callback; }
  };
  vm.runInNewContext(await readFile(new URL('../sw.js', import.meta.url), 'utf8'), {
    self, URL, Set, Promise,
    caches: { match: async request => ({ cached: typeof request === 'string' ? request : request.url }) },
    fetch: async request => { network.push(request.url); return { network: request.url }; }
  });
  return {
    network,
    fetch(url, mode = 'navigate', method = 'GET') {
      let response;
      handlers.fetch({ request: { url, mode, method }, respondWith: promise => { response = promise; } });
      return response;
    }
  };
}
test('cached shell accepts hash routes under a repository subpath', async () => {
  const app = await worker();
  for (const url of ['https://example.test/demo/', 'https://example.test/demo/index.html#edit/LOCAL-example']) {
    assert.deepEqual(await app.fetch(url), { cached: './index.html' });
  }
  assert.equal(app.network.length, 0);
});
test('new editor modules belong to the static shell allowlist', async () => {
  const app = await worker();
  for (const name of ['demo-domain.js', 'draft-editor.js', 'storage.js', 'demo-contracts.js', 'project-pages.js', 'record-store.js', 'variation-storage.js', 'variation-domain.js', 'variation-editor.js', 'demo-claims.js', 'certificate-domain.js', 'certificate-storage.js', 'certificate-editor.js', 'certificate-pages.js']) {
    const url = 'https://example.test/demo/' + name;
    assert.deepEqual(await app.fetch(url, 'cors'), { cached: url });
  }
});
test('worker does not intercept unknown, foreign, query-bearing or mutating requests', async () => {
  const app = await worker();
  for (const url of ['https://example.test/api/claims', 'https://other.test/demo/', 'https://example.test/demo/?private=1']) assert.equal(app.fetch(url), undefined);
  assert.equal(app.fetch('https://example.test/demo/', 'navigate', 'POST'), undefined);
});
