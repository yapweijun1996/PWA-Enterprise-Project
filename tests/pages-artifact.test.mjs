import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { preparePages } from '../tools/prepare-pages.mjs';

test('Pages artifact contains the complete runtime and excludes repository internals', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'constructclaim-pages-'));
  try {
    const output = path.join(directory, 'site');
    await preparePages(output);
    const files = await readdir(output);
    for (const name of ['index.html', 'app.js', 'app.css', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', '.nojekyll']) assert.ok(files.includes(name));
    for (const name of ['.git', '.github', 'tests', 'tools', 'ui', 'README.md', 'PROGRESS.md']) assert.ok(!files.includes(name));
    const manifest = JSON.parse(await readFile(path.join(output, 'manifest.webmanifest'), 'utf8'));
    assert.equal(manifest.id, undefined, 'Explicit relative IDs would resolve against the shared origin');
    assert.equal(new URL(manifest.start_url, 'https://example.test/PWA-Enterprise-Project/manifest.webmanifest').href, 'https://example.test/PWA-Enterprise-Project/#home');
    for (const name of files.filter(file => file !== '.nojekyll')) {
      assert.deepEqual(await readFile(path.join(output, name)), await readFile(new URL(`../${name}`, import.meta.url)));
    }
  } finally {
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('constructclaim-pages-'));
    await rm(directory, { recursive: true, force: true });
  }
});
test('Pages preparation refuses to overwrite an existing directory', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'constructclaim-pages-'));
  try {
    await writeFile(path.join(directory, 'keep.txt'), 'User-owned data');
    await assert.rejects(preparePages(directory), { code: 'EEXIST' });
    assert.equal(await readFile(path.join(directory, 'keep.txt'), 'utf8'), 'User-owned data');
  } finally {
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.ok(path.basename(directory).startsWith('constructclaim-pages-'));
    await rm(directory, { recursive: true, force: true });
  }
});
