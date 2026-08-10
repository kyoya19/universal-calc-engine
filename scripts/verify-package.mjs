import { spawnSync } from 'node:child_process';
import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const distDir = join(rootDir, 'dist');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tscCommand = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';

function fail(message) {
  throw new Error(message);
}

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    if (capture) {
      process.stderr.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
    }
    fail(`${command} ${args.join(' ')} failed with exit code ${String(result.status)}`);
  }
  return result;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await listFiles(absolutePath, relativePath)));
    } else {
      result.push(relativePath);
    }
  }
  return result;
}

const packageJson = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'));
if (packageJson.private !== true) {
  fail('package.json must remain private for this distribution-readiness boundary');
}
if (packageJson.version !== '0.0.1') {
  fail('package version must remain 0.0.1 for this distribution-readiness boundary');
}
if (packageJson.type !== 'module') {
  fail('package must remain ESM with type=module');
}
if (packageJson.main !== './dist/index.js' || packageJson.module !== './dist/index.js') {
  fail('package runtime entrypoint must be ./dist/index.js');
}
if (packageJson.types !== './dist/index.d.ts') {
  fail('package declaration entrypoint must be ./dist/index.d.ts');
}

for (const required of ['index.js', 'index.d.ts']) {
  if (!(await exists(join(distDir, required)))) {
    fail(`Missing build artifact: dist/${required}`);
  }
}

const distFiles = await listFiles(distDir);
for (const path of distFiles) {
  if (path.includes('/test/') || path.includes('/examples/') || path.endsWith('.test.js')) {
    fail(`Development-only file leaked into dist/: ${path}`);
  }
}

let tempDir;
let tarballPath;
try {
  const pack = run(npmCommand, ['pack', '--json'], rootDir, true);
  const packResult = JSON.parse(pack.stdout ?? '[]');
  if (!Array.isArray(packResult) || packResult.length !== 1) {
    fail('npm pack --json did not return exactly one package result');
  }
  const packed = packResult[0];
  if (typeof packed?.filename !== 'string' || !Array.isArray(packed.files)) {
    fail('npm pack --json returned an unexpected result shape');
  }
  tarballPath = join(rootDir, packed.filename);

  const packedPaths = packed.files.map((file) => file.path);
  for (const required of [
    'package.json',
    'README.md',
    'COMMERCIAL-LICENSE.md',
    'dist/index.js',
    'dist/index.d.ts'
  ]) {
    if (!packedPaths.includes(required)) {
      fail(`Packed artifact is missing ${required}`);
    }
  }
  for (const path of packedPaths) {
    if (
      path === 'package-lock.json' ||
      path.startsWith('packages/') ||
      path.startsWith('scripts/') ||
      path.startsWith('.github/') ||
      path.includes('/test/') ||
      path.includes('/examples/') ||
      path.startsWith('tsconfig') ||
      path.startsWith('vitest.config')
    ) {
      fail(`Development-only file leaked into npm package: ${path}`);
    }
  }

  tempDir = await mkdtemp(join(tmpdir(), 'universal-calc-engine-consumer-'));
  await writeFile(
    join(tempDir, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }, null, 2),
    'utf8'
  );

  run(
    npmCommand,
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath],
    tempDir
  );

  await writeFile(
    join(tempDir, 'smoke.mjs'),
    `import * as api from 'universal-calc-engine';\n\nconst required = [\n  'evaluateDefinitionModel',\n  'evaluateAcyclicDirectDefinitionModel',\n  'evaluateDefinitionModelWithSolver',\n  'estimateExternalReverseInput',\n  'toForwardResultHandoff',\n  'toReverseResultHandoff'\n];\nfor (const name of required) {\n  if (typeof api[name] !== 'function') {\n    throw new Error(\`Missing runtime export: \${name}\`);\n  }\n}\n`,
    'utf8'
  );
  run(process.execPath, ['smoke.mjs'], tempDir);

  await writeFile(
    join(tempDir, 'smoke.ts'),
    `import {\n  evaluateDefinitionModel,\n  evaluateAcyclicDirectDefinitionModel,\n  evaluateDefinitionModelWithSolver,\n  estimateExternalReverseInput,\n  toForwardResultHandoff,\n  toReverseResultHandoff,\n  type DefinitionModel,\n  type ForwardSolverRequest\n} from 'universal-calc-engine';\n\nconst model: DefinitionModel = {\n  startState: 'done',\n  states: [{ id: 'done', terminal: true }],\n  transitions: []\n};\nconst request: ForwardSolverRequest = { solverMethod: 'iterative' };\nvoid evaluateDefinitionModel(model);\nvoid evaluateAcyclicDirectDefinitionModel(model);\nvoid evaluateDefinitionModelWithSolver(model, request);\nvoid estimateExternalReverseInput({});\nvoid toForwardResultHandoff;\nvoid toReverseResultHandoff;\n`,
    'utf8'
  );
  run(
    tscCommand,
    [
      '--noEmit',
      '--strict',
      '--target',
      'ES2022',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      'smoke.ts'
    ],
    tempDir
  );

  console.log(
    `Package smoke test passed: ${packedPaths.length} packed files, runtime ESM import and NodeNext declarations verified.`
  );
} finally {
  if (tempDir !== undefined) {
    await rm(tempDir, { recursive: true, force: true });
  }
  if (tarballPath !== undefined) {
    await rm(tarballPath, { force: true });
  }
}
