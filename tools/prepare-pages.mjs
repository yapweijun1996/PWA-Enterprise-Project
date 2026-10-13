import { copyFile, lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = new URL('https://example.test/PWA-Enterprise-Project/');

export async function preparePages(destination) {
  const worker = await readFile(path.join(root, 'sw.js'), 'utf8');
  // The worker owns the offline shell inventory; packaging uses that same inventory.
  const shell = vm.runInNewContext(`${worker}\nSHELL`, {
    self: { registration: { scope: base.href }, location: { origin: base.origin }, addEventListener() {} },
    URL, Request, Set, Promise
  }, { timeout: 1000 });
  if (!Array.isArray(shell)) throw new Error('The service worker must declare its shell assets.');
  const names = new Set(['sw.js']);
  for (const resource of shell) {
    if (resource === './') { names.add('index.html'); continue; }
    if (!/^\.\/[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(resource)) throw new Error(`Unsupported shell asset: ${resource}`);
    names.add(resource.slice(2));
  }
  const contents = new Map();
  for (const name of names) {
    const source = path.join(root, name);
    if (!(await lstat(source)).isFile()) throw new Error(`Shell asset must be a regular file: ${name}`);
    contents.set(name, await readFile(source));
  }
  function requireAsset(reference) {
    if (!reference.startsWith('./') || !contents.has(reference.slice(2).split(/[?#]/)[0])) {
      throw new Error(`Asset is missing from the static shell: ${reference}`);
    }
  }
  for (const [name, bytes] of contents) {
    if (name.endsWith('.js')) {
      for (const match of bytes.toString('utf8').matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g)) requireAsset(match[1]);
    }
  }
  const html = contents.get('index.html')?.toString('utf8');
  if (!html) throw new Error('The artifact requires a top-level index.html.');
  for (const match of html.matchAll(/(?:src|href)\s*=\s*['"]([^'"#][^'"]*)['"]/g)) requireAsset(match[1]);
  const manifest = JSON.parse(contents.get('manifest.webmanifest')?.toString('utf8') || 'null');
  if (!manifest || manifest.scope !== './' || manifest.display !== 'standalone' || typeof manifest.start_url !== 'string') {
    throw new Error('The manifest must retain a start URL, repository-relative scope and standalone display.');
  }
  // Explicit relative IDs resolve against the origin, not the manifest directory.
  // Default identity follows the stable start URL and separates Pages repository paths.
  if (manifest.id !== undefined) throw new Error('Omit the manifest ID to derive identity from the repository start URL.');
  const launch = new URL(manifest.start_url, base);
  if (launch.origin !== base.origin || !launch.pathname.startsWith(base.pathname)) throw new Error('The start URL escapes the repository scope.');
  for (const size of [192, 512]) {
    const icon = manifest.icons?.find(item => item.sizes === `${size}x${size}` && item.type === 'image/png');
    if (!icon) throw new Error(`The manifest requires a ${size}px PNG icon.`);
    requireAsset(icon.src);
    const bytes = contents.get(icon.src.slice(2));
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.readUInt32BE(16) !== size || bytes.readUInt32BE(20) !== size) {
      throw new Error(`PNG dimensions do not match the manifest: ${icon.src}`);
    }
  }
  // Refuse to replace an existing directory, including unrelated local files.
  await mkdir(destination);
  for (const name of names) await copyFile(path.join(root, name), path.join(destination, name));
  await writeFile(path.join(destination, '.nojekyll'), '');
  return [...names, '.nojekyll'].sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destination = path.resolve(process.argv[2] || '_site');
  const files = await preparePages(destination);
  console.log(`Prepared ${files.length} validated static files in ${destination}`);
}
