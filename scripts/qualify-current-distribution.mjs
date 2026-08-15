import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const distDir = join(rootDir, 'dist');
const outputDir = join(rootDir, 'qualification-output');
const packageJsonPath = join(rootDir, 'package.json');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;
const generateApiManifestOnly = process.argv.includes('--generate-api-manifest');
const expectedVersion = '1.1.0';
const expectedAnalyticalSubject = 'subject-public-8b341032516a';
const expectedAnalyticalCommit = '8b341032516a2f5108170743c4dafd8fde31a229';
const apiManifestPath = join(outputDir, 'package-api-v1.1.0.json');

const qualifiedFacadeRuntimeFunctions = [
  'analyzeParameterSensitivity',
  'compareExternalModelScenarios',
  'estimateExternalReverseInput',
  'estimateExternalReverseJson',
  'evaluateAcyclicDirectDefinitionModel',
  'evaluateDefinitionModel',
  'evaluateDefinitionModelWithSolver',
  'evaluateExternalModelInput',
  'evaluateExternalModelJson',
  'formatForwardResultHandoffPlainText',
  'formatReverseResultHandoffPlainText',
  'forwardResultHandoffToJson',
  'reverseResultHandoffToJson',
  'toForwardResultHandoff',
  'toReverseResultHandoff'
].sort();

const qualifiedTypeExports = [
  'DefinitionModel',
  'ForwardResultHandoff',
  'ForwardSolverRequest',
  'ObservationDataset',
  'ReverseResultHandoff'
].sort();

const showcaseRequiredRuntimeFunctions = [
  'analyzeFiniteAdditiveTrajectoryFunctionalDistribution',
  'analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence',
  'analyzeFiniteHorizonFirstPassage',
  'analyzeFiniteMarkovLongRunBehavior',
  'classifyFiniteModelFamilyIdentifiability',
  'conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue',
  'inferFiniteHiddenObservationCandidates',
  'propagateFiniteHorizonStateDistribution',
  'reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories',
  'selectFiniteAmbiguityPreservingRobustActions'
].sort();

function fail(classification, message) {
  throw new Error(`${classification}: ${message}`);
}

function assert(condition, classification, message) {
  if (!condition) fail(classification, message);
}

function assertEqual(actual, expected, classification, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(classification, `${label} mismatch\nexpected=${JSON.stringify(expected)}\nactual=${JSON.stringify(actual)}`);
  }
}

function run(command, args, cwd, capture = false, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    if (capture) {
      process.stderr.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
    }
    fail('build_failure', `${command} ${args.join(' ')} exited ${String(result.status)}`);
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

function sha256Buffer(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function listFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) result.push(...(await listFiles(absolute, path)));
    else result.push(path);
  }
  return result.sort();
}

async function runtimeAndDeclarationSurfaces() {
  const runtime = await import(`${pathToFileURL(join(distDir, 'index.js')).href}?orf=${Date.now()}`);
  const runtimeExports = Object.keys(runtime).sort();
  const declarationPath = join(distDir, 'index.d.ts');
  const program = ts.createProgram([declarationPath], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noEmit: true,
    skipLibCheck: false
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length > 0) {
    fail(
      'type_declaration_failure',
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => rootDir,
        getNewLine: () => '\n'
      })
    );
  }
  const source = program.getSourceFile(declarationPath);
  assert(source?.symbol !== undefined, 'type_declaration_failure', 'dist/index.d.ts is not an external module');
  const declarationExports = program
    .getTypeChecker()
    .getExportsOfModule(source.symbol)
    .map((symbol) => symbol.getName())
    .filter((name) => name !== 'default')
    .sort();
  return { runtimeExports, declarationExports };
}

async function validateMetadata(packageJson) {
  const classification = 'package_metadata_invalid';
  assertEqual(packageJson.name, 'universal-calc-engine', classification, 'name');
  assertEqual(packageJson.version, expectedVersion, classification, 'version');
  assertEqual(packageJson.private, false, classification, 'private');
  assertEqual(packageJson.type, 'module', classification, 'type');
  assertEqual(packageJson.main, './dist/index.js', classification, 'main');
  assertEqual(packageJson.module, './dist/index.js', classification, 'module');
  assertEqual(packageJson.types, './dist/index.d.ts', classification, 'types');
  assertEqual(packageJson.exports, { '.': { types: './dist/index.d.ts', import: './dist/index.js' } }, classification, 'exports');
  assertEqual(packageJson.files, ['dist', 'README.md', 'COMMERCIAL-LICENSE.md'], classification, 'files');
  assertEqual(packageJson.engines?.node, '>=22.14.0 <23 || >=24.0.0 <25', classification, 'engines.node');
  assertEqual(
    packageJson.repository,
    { type: 'git', url: 'https://github.com/kyoya19/universal-calc-engine.git' },
    classification,
    'repository'
  );
  assertEqual(
    packageJson.orfs,
    {
      distributionContract: 'ORF-DISTRIBUTION-CONTRACT-v1',
      analyticalSubject: expectedAnalyticalSubject,
      analyticalCommit: expectedAnalyticalCommit
    },
    classification,
    'orfs'
  );
  assert(packageJson.dependencies === undefined, classification, 'runtime dependencies are forbidden');
  assert(packageJson.optionalDependencies === undefined, classification, 'runtime optionalDependencies are forbidden');
  for (const lifecycle of ['preinstall', 'install', 'postinstall']) {
    assert(packageJson.scripts?.[lifecycle] === undefined, classification, `${lifecycle} lifecycle script is forbidden`);
  }
}

async function buildApiManifest(packageJson) {
  const { runtimeExports, declarationExports } = await runtimeAndDeclarationSurfaces();
  for (const name of [...qualifiedFacadeRuntimeFunctions, ...showcaseRequiredRuntimeFunctions]) {
    assert(runtimeExports.includes(name), 'runtime_type_surface_divergence', `missing runtime export ${name}`);
    assert(declarationExports.includes(name), 'runtime_type_surface_divergence', `missing declaration export ${name}`);
  }
  for (const name of qualifiedTypeExports) {
    assert(declarationExports.includes(name), 'runtime_type_surface_divergence', `missing qualified type export ${name}`);
  }
  for (const name of runtimeExports) {
    assert(declarationExports.includes(name), 'runtime_type_surface_divergence', `runtime export ${name} has no declaration counterpart`);
  }
  return {
    schemaVersion: 1,
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    distributionContract: 'ORF-DISTRIBUTION-CONTRACT-v1',
    analyticalSubject: {
      subjectId: expectedAnalyticalSubject,
      commitSha: expectedAnalyticalCommit
    },
    qualifiedEntryPoints: {
      runtimeFunctions: qualifiedFacadeRuntimeFunctions,
      typeExports: qualifiedTypeExports,
      showcaseRequiredRuntimeFunctions
    },
    rootCompatibilityExports: {
      runtime: runtimeExports,
      declarations: declarationExports
    }
  };
}

function npmPack() {
  const result = run(npmCommand, ['pack', '--json'], rootDir, true);
  let parsed;
  try {
    parsed = JSON.parse(result.stdout || '[]');
  } catch {
    fail('pack_content_violation', 'npm pack --json returned invalid JSON');
  }
  assert(Array.isArray(parsed) && parsed.length === 1, 'pack_content_violation', 'npm pack returned unexpected result count');
  const packed = parsed[0];
  assert(typeof packed.filename === 'string', 'pack_content_violation', 'npm pack filename missing');
  assert(Array.isArray(packed.files), 'pack_content_violation', 'npm pack file list missing');
  return { packed, tarballPath: join(rootDir, packed.filename) };
}

async function normalizedManifest(packageJson, packed, apiManifest) {
  const packedPaths = packed.files.map((file) => file.path).sort();
  const allowed = (path) =>
    path === 'package.json' ||
    path === 'README.md' ||
    path === 'COMMERCIAL-LICENSE.md' ||
    /^dist\/.+\.js$/.test(path) ||
    /^dist\/.+\.d\.ts$/.test(path);
  const forbiddenPatterns = [
    /^package-lock\.json$/,
    /^packages\//,
    /^scripts\//,
    /^\.github\//,
    /(^|\/)test(s)?\//,
    /(^|\/)examples\//,
    /^coverage\//,
    /^tsconfig/,
    /^vitest\.config/,
    /^(?!.*\.d\.ts$).*\.ts$/,
    /^\.npmrc$/,
    /\.map$/
  ];
  for (const required of ['package.json', 'README.md', 'COMMERCIAL-LICENSE.md', 'dist/index.js', 'dist/index.d.ts']) {
    assert(packedPaths.includes(required), 'pack_content_violation', `packed artifact missing ${required}`);
  }
  for (const path of packedPaths) {
    assert(allowed(path), 'pack_content_violation', `packed artifact path not allowed: ${path}`);
    for (const pattern of forbiddenPatterns) {
      assert(!pattern.test(path), 'pack_content_violation', `forbidden packed artifact path: ${path}`);
    }
  }
  const files = [];
  for (const path of packedPaths) {
    const bytes = await readFile(join(rootDir, path));
    files.push({ path, size: bytes.length, sha256: sha256Buffer(bytes) });
  }
  return {
    schemaVersion: 1,
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    files,
    packageJsonSha256: sha256Buffer(await readFile(packageJsonPath)),
    qualifiedApiManifestSha256: sha256Buffer(Buffer.from(JSON.stringify(apiManifest), 'utf8'))
  };
}

async function runConsumerQualification(tarballPath) {
  const tempDir = await mkdtemp(join(tmpdir(), 'orf-current-dist-consumer-'));
  try {
    await writeFile(join(tempDir, 'package.json'), `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`, 'utf8');
    run(npmCommand, ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath], tempDir);
    const runtimeSmoke = `import * as api from 'universal-calc-engine';\nconst required=${JSON.stringify([...qualifiedFacadeRuntimeFunctions, ...showcaseRequiredRuntimeFunctions])};\nfor(const name of required){if(typeof api[name]!=='function')throw new Error('Missing required runtime export: '+name);}\nconsole.log(JSON.stringify({rootEsmImport:'PASS',showcaseRequiredApis:'PASS',count:required.length}));\n`;
    await writeFile(join(tempDir, 'runtime-smoke.mjs'), runtimeSmoke, 'utf8');
    run(nodeCommand, ['runtime-smoke.mjs'], tempDir);

    const deepImport = spawnSync(
      nodeCommand,
      ['--input-type=module', '-e', `import('universal-calc-engine/dist/model.js').then(()=>process.exit(2)).catch((error)=>{if(error.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED'){console.error(error);process.exit(3)}})`],
      { cwd: tempDir, encoding: 'utf8' }
    );
    assertEqual(deepImport.status, 0, 'export_contract_violation', 'deep import rejection exit status');

    const typeImports = [...qualifiedFacadeRuntimeFunctions, ...showcaseRequiredRuntimeFunctions].join(',\n  ');
    await writeFile(
      join(tempDir, 'type-smoke.ts'),
      `import {\n  ${typeImports},\n  type DefinitionModel,\n  type ForwardResultHandoff,\n  type ForwardSolverRequest,\n  type ObservationDataset,\n  type ReverseResultHandoff\n} from 'universal-calc-engine';\nconst runtime=[${[...qualifiedFacadeRuntimeFunctions, ...showcaseRequiredRuntimeFunctions].join(',')}]; void runtime;\nlet model!:DefinitionModel; let forward!:ForwardResultHandoff; let request!:ForwardSolverRequest; let observations!:ObservationDataset; let reverse!:ReverseResultHandoff; void model; void forward; void request; void observations; void reverse;\n`,
      'utf8'
    );
    for (const version of ['5.5.4']) {
      run(npmCommand, ['install', '--save-dev', '--ignore-scripts', '--no-audit', '--no-fund', `typescript@${version}`], tempDir);
      run(
        join(tempDir, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc'),
        ['--noEmit', '--strict', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'type-smoke.ts'],
        tempDir
      );
    }

    const installedDist = join(tempDir, 'node_modules', 'universal-calc-engine', 'dist');
    for (const path of (await listFiles(installedDist)).filter((path) => path.endsWith('.d.ts'))) {
      const source = await readFile(join(installedDist, path), 'utf8');
      assert(!source.includes('packages/core/src'), 'type_declaration_failure', `${path} references repository source`);
      assert(!source.includes('../packages/'), 'type_declaration_failure', `${path} references unpublished packages path`);
    }
    return { compilerVersions: ['5.5.4'] };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function validateDocumentationAndWorkflow() {
  const readme = await readFile(join(rootDir, 'README.md'), 'utf8');
  for (const text of [
    'npm install universal-calc-engine',
    'ESM only',
    "from 'universal-calc-engine'",
    '>=22.14.0 <23',
    '>=24.0.0 <25',
    'TypeScript',
    'COMMERCIAL-LICENSE.md',
    'functional-contract v1',
    'package 1.1.0',
    expectedAnalyticalSubject,
    'historical package 1.0.0'
  ]) {
    assert(readme.includes(text), 'consumer_documentation_contract_failure', `README missing required distribution text: ${text}`);
  }
  const workflow = await readFile(join(rootDir, '.github', 'workflows', 'publish-package.yml'), 'utf8');
  for (const text of [
    "'package-v*'",
    'contents: read',
    'id-token: write',
    'actions/checkout@v6',
    'actions/setup-node@v6',
    'npm publish qualification-output/universal-calc-engine-1.1.0.tgz --provenance',
    'https://registry.npmjs.org'
  ]) {
    assert(workflow.includes(text), 'consumer_documentation_contract_failure', `release workflow missing: ${text}`);
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  await validateMetadata(packageJson);
  for (const required of ['index.js', 'index.d.ts']) {
    assert(await exists(join(distDir, required)), 'build_failure', `Missing build artifact dist/${required}`);
  }
  const apiManifest = await buildApiManifest(packageJson);
  await writeFile(apiManifestPath, stableJson(apiManifest), 'utf8');
  if (generateApiManifestOnly) {
    console.log(stableJson(apiManifest));
    return;
  }

  const first = npmPack();
  const firstManifest = await normalizedManifest(packageJson, first.packed, apiManifest);
  const firstTarballHash = sha256Buffer(await readFile(first.tarballPath));
  await rm(first.tarballPath, { force: true });

  run(npmCommand, ['run', 'build'], rootDir);

  const second = npmPack();
  const secondManifest = await normalizedManifest(packageJson, second.packed, apiManifest);
  const secondTarballHash = sha256Buffer(await readFile(second.tarballPath));
  assertEqual(secondManifest, firstManifest, 'pack_reproducibility_failure', 'normalized packed manifest');
  assertEqual(secondTarballHash, firstTarballHash, 'pack_reproducibility_failure', 'tarball SHA-256');

  const exactTarballPath = join(outputDir, `universal-calc-engine-${expectedVersion}.tgz`);
  await rm(exactTarballPath, { force: true });
  await rename(second.tarballPath, exactTarballPath);

  const consumer = await runConsumerQualification(exactTarballPath);
  await validateDocumentationAndWorkflow();
  const { runtimeExports, declarationExports } = await runtimeAndDeclarationSurfaces();
  const nodeVersion = process.version.replace(/^v/, '');
  const candidateCommit = run('git', ['rev-parse', 'HEAD'], rootDir, true).stdout.trim();
  const qualification = {
    schemaVersion: 1,
    gate: 'CURRENT_GENERATION_PREPUBLICATION_1_1_0',
    status: 'PASS',
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    candidateCommit,
    analyticalSubject: expectedAnalyticalSubject,
    analyticalCommit: expectedAnalyticalCommit,
    nodeVersion: process.version,
    npmVersion: run(npmCommand, ['--version'], rootDir, true).stdout.trim(),
    checks: {
      metadata: 'PASS',
      packContent: 'PASS',
      rootRuntimeExports: 'PASS',
      rootDeclarationExports: 'PASS',
      exactTarballConsumerInstall: 'PASS',
      packageNameRootEsmImport: 'PASS',
      typeScriptDeclarationConsumer: 'PASS',
      undocumentedDeepImportRejected: 'PASS',
      reproducibleTarball: 'PASS',
      showcaseRequiredApiAvailability: 'PASS',
      showcaseFilesExcludedFromTarball: 'PASS',
      documentationAndReleaseSecuritySurface: 'PASS'
    },
    showcaseRequiredRuntimeFunctions,
    compilerVersions: consumer.compilerVersions,
    tarballSha256: secondTarballHash,
    packedFileCount: secondManifest.files.length
  };
  await writeFile(join(outputDir, `current-generation-distribution-qualification-node-${nodeVersion}.json`), stableJson(qualification), 'utf8');
  await writeFile(join(outputDir, `normalized-manifest-node-${nodeVersion}.json`), stableJson(secondManifest), 'utf8');
  await writeFile(join(outputDir, `root-runtime-exports-node-${nodeVersion}.json`), stableJson({ schemaVersion: 1, status: 'PASS', exports: runtimeExports }), 'utf8');
  await writeFile(join(outputDir, `root-declaration-exports-node-${nodeVersion}.json`), stableJson({ schemaVersion: 1, status: 'PASS', exports: declarationExports }), 'utf8');
  await writeFile(join(outputDir, `packed-tarball-sha256-node-${nodeVersion}.txt`), `${secondTarballHash}\n`, 'utf8');
  console.log(stableJson(qualification));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
