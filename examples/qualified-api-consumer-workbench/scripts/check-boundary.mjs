import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(packageJson.private === true, 'Workbench package must remain private.');
assert(
  packageJson.dependencies?.['universal-calc-engine'] === '1.1.0',
  'Workbench must depend on exact universal-calc-engine@1.1.0.'
);

const dependency = packageJson.dependencies['universal-calc-engine'];
assert(
  !/^(file:|link:|workspace:)/.test(dependency),
  'Local/workspace substitution for the qualified package is forbidden.'
);

const executableRoots = ['adapter.mjs', 'server.mjs', 'public', 'test'];

async function filesUnder(path) {
  const absolute = join(root, path);
  if (!['.mjs', '.js', '.cjs'].includes(extname(absolute))) {
    const entries = await readdir(absolute, { withFileTypes: true });
    const nested = [];
    for (const entry of entries) {
      const child = join(absolute, entry.name);
      if (entry.isDirectory()) {
        nested.push(...(await filesUnder(relative(root, child))));
      } else if (['.mjs', '.js', '.cjs'].includes(extname(entry.name))) {
        nested.push(child);
      }
    }
    return nested;
  }
  return [absolute];
}

const executableFiles = [];
for (const path of executableRoots) {
  executableFiles.push(...(await filesUnder(path)));
}

const forbidden = [
  ['core source coupling', /packages\/core\/src/],
  ['deep package import', /universal-calc-engine\//],
  ['repository dist coupling', /dist\/index\.js/],
  ['npm link substitution', /\bnpm\s+link\b/],
  ['workspace dependency substitution', /\bworkspace:/]
];

for (const path of executableFiles) {
  const source = await readFile(path, 'utf8');
  for (const [label, pattern] of forbidden) {
    assert(!pattern.test(source), `${label} found in ${relative(root, path)}.`);
  }
}

const adapterSource = await readFile(join(root, 'adapter.mjs'), 'utf8');
const rootImports = adapterSource.match(/from\s+['"]universal-calc-engine['"]/g) ?? [];
assert(rootImports.length === 1, 'Adapter must contain exactly one package-name root import.');

for (const apiName of [
  'evaluateExternalModelJson',
  'toForwardResultHandoff',
  'estimateExternalReverseJson',
  'toReverseResultHandoff'
]) {
  assert(adapterSource.includes(apiName), `Selected qualified API missing from adapter: ${apiName}`);
}

console.log('Workbench boundary check: PASS');
