import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const distDir = join(rootDir, 'dist');
const outputDir = join(rootDir, 'qualification-output');
const apiManifestPath = join(rootDir, 'docs', 'package-api-v1.json');
const packageJsonPath = join(rootDir, 'package.json');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;
const generateApiManifest = process.argv.includes('--generate-api-manifest');

const qualifiedRuntimeFunctions = [
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

function fail(classification, message) {
  const error = new Error(`${classification}: ${message}`);
  error.classification = classification;
  throw error;
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

function sha256Text(value) {
  return sha256Buffer(Buffer.from(value, 'utf8'));
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

function assertEqual(actual, expected, classification, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      classification,
      `${label} mismatch\nexpected=${JSON.stringify(expected)}\nactual=${JSON.stringify(actual)}`
    );
  }
}

function assert(condition, classification, message) {
  if (!condition) fail(classification, message);
}

async function runtimeAndDeclarationSurfaces() {
  const runtime = await import(`${pathToFileURL(join(distDir, 'index.js')).href}?orf=${Date.now()}`);
  const runtimeExports = Object.keys(runtime).sort();

  const program = ts.createProgram([join(distDir, 'index.d.ts')], {
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
  const source = program.getSourceFile(join(distDir, 'index.d.ts'));
  assert(source?.symbol !== undefined, 'type_declaration_failure', 'dist/index.d.ts is not an external module');
  const checker = program.getTypeChecker();
  const declarationExports = checker
    .getExportsOfModule(source.symbol)
    .map((symbol) => symbol.getName())
    .filter((name) => name !== 'default')
    .sort();

  return { runtimeExports, declarationExports };
}

async function buildApiManifest(packageJson) {
  const { runtimeExports, declarationExports } = await runtimeAndDeclarationSurfaces();
  for (const name of qualifiedRuntimeFunctions) {
    assert(runtimeExports.includes(name), 'runtime_type_surface_divergence', `missing runtime export ${name}`);
    assert(
      declarationExports.includes(name),
      'runtime_type_surface_divergence',
      `missing declaration export ${name}`
    );
  }
  for (const name of qualifiedTypeExports) {
    assert(
      declarationExports.includes(name),
      'runtime_type_surface_divergence',
      `missing qualified type export ${name}`
    );
  }
  for (const name of runtimeExports) {
    assert(
      declarationExports.includes(name),
      'runtime_type_surface_divergence',
      `runtime export ${name} has no declaration-visible counterpart`
    );
  }

  return {
    schemaVersion: 1,
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    distributionContract: 'ORF-DISTRIBUTION-CONTRACT-v1',
    analyticalSubject: {
      subjectId: 'subject-public-1df6235d58a5',
      commitSha: '1df6235d58a5027fdae0390f7a73a09cfb4ee1ee'
    },
    qualifiedEntryPoints: {
      runtimeFunctions: qualifiedRuntimeFunctions,
      typeExports: qualifiedTypeExports
    },
    rootCompatibilityExports: {
      runtime: runtimeExports,
      declarations: declarationExports
    }
  };
}

async function validateMetadata(packageJson) {
  const classification = 'package_metadata_invalid';
  assertEqual(packageJson.name, 'universal-calc-engine', classification, 'name');
  assertEqual(packageJson.version, '1.0.0', classification, 'version');
  assertEqual(packageJson.private, false, classification, 'private');
  assertEqual(packageJson.type, 'module', classification, 'type');
  assertEqual(packageJson.main, './dist/index.js', classification, 'main');
  assertEqual(packageJson.module, './dist/index.js', classification, 'module');
  assertEqual(packageJson.types, './dist/index.d.ts', classification, 'types');
  assertEqual(
    packageJson.exports,
    { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
    classification,
    'exports'
  );
  assertEqual(packageJson.files, ['dist', 'README.md', 'COMMERCIAL-LICENSE.md'], classification, 'files');
  assertEqual(packageJson.license, 'SEE LICENSE IN COMMERCIAL-LICENSE.md', classification, 'license');
  assertEqual(
    packageJson.engines?.node,
    '>=22.14.0 <23 || >=24.0.0 <25',
    classification,
    'engines.node'
  );
  assertEqual(
    packageJson.repository,
    { type: 'git', url: 'https://github.com/kyoya19/universal-calc-engine.git' },
    classification,
    'repository'
  );
  assertEqual(
    packageJson.bugs,
    { url: 'https://github.com/kyoya19/universal-calc-engine/issues' },
    classification,
    'bugs'
  );
  assertEqual(
    packageJson.homepage,
    'https://github.com/kyoya19/universal-calc-engine#readme',
    classification,
    'homepage'
  );
  assertEqual(
    packageJson.publishConfig,
    { registry: 'https://registry.npmjs.org/', access: 'public' },
    classification,
    'publishConfig'
  );
  assertEqual(
    packageJson.orfs,
    {
      distributionContract: 'ORF-DISTRIBUTION-CONTRACT-v1',
      analyticalSubject: 'subject-public-1df6235d58a5',
      analyticalCommit: '1df6235d58a5027fdae0390f7a73a09cfb4ee1ee'
    },
    classification,
    'orfs'
  );
  assert(packageJson.dependencies === undefined, classification, 'runtime dependencies are forbidden');
  assert(
    packageJson.optionalDependencies === undefined,
    classification,
    'runtime optionalDependencies are forbidden'
  );
  for (const lifecycle of ['preinstall', 'install', 'postinstall']) {
    assert(packageJson.scripts?.[lifecycle] === undefined, classification, `${lifecycle} lifecycle script is forbidden`);
  }
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

async function normalizedManifest(packageJson, packed) {
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
    /\.ts$/,
    /^\.npmrc$/,
    /\.map$/
  ];

  for (const required of [
    'package.json',
    'README.md',
    'COMMERCIAL-LICENSE.md',
    'dist/index.js',
    'dist/index.d.ts'
  ]) {
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
    const absolute = join(rootDir, path);
    const bytes = await readFile(absolute);
    files.push({ path, size: bytes.length, sha256: sha256Buffer(bytes) });
  }
  const apiManifestBytes = await readFile(apiManifestPath);
  const manifest = {
    schemaVersion: 1,
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    files,
    packageJsonSha256: sha256Buffer(await readFile(packageJsonPath)),
    qualifiedApiManifestSha256: sha256Buffer(apiManifestBytes)
  };
  return {
    manifest,
    manifestSha256: sha256Text(JSON.stringify(manifest))
  };
}

function writeConsumerRuntimeSmoke(tempDir) {
  return writeFile(
    join(tempDir, 'runtime-smoke.mjs'),
    `import * as api from 'universal-calc-engine';\n\nconst required = ${JSON.stringify(qualifiedRuntimeFunctions)};\nfor (const name of required) {\n  if (typeof api[name] !== 'function') throw new Error(\`Missing qualified runtime export: \${name}\`);\n}\n\nconst forwardInput = {\n  schemaVersion: 1,\n  modelKind: 'base',\n  parameterValues: { successProbability: 0.6, successReward: 200, attemptMinutes: 1.5 },\n  model: {\n    startState: 'start',\n    states: [{ id: 'start' }, { id: 'success', terminal: true }, { id: 'failure', terminal: true }],\n    parameters: [\n      { id: 'successProbability' },\n      { id: 'successReward', unit: 'points' },\n      { id: 'attemptMinutes', unit: 'minutes' }\n    ],\n    transitions: [\n      {\n        from: 'start', to: 'success',\n        probability: { type: 'parameter_ref', parameter: 'successProbability' },\n        reward: { type: 'parameter_ref', parameter: 'successReward' },\n        elapsedTime: { value: { type: 'parameter_ref', parameter: 'attemptMinutes' }, unit: 'minutes' }\n      },\n      {\n        from: 'start', to: 'failure',\n        probability: { type: 'formula', operator: 'subtract', left: 1, right: { type: 'parameter_ref', parameter: 'successProbability' } },\n        elapsedTime: { value: { type: 'parameter_ref', parameter: 'attemptMinutes' }, unit: 'minutes' }\n      }\n    ]\n  }\n};\nconst forwardResult = api.evaluateExternalModelJson(JSON.stringify(forwardInput), { reachabilityTargets: ['success'] });\nconst forward = api.toForwardResultHandoff(forwardResult);\nif (forward.status !== 'success') throw new Error('Forward handoff failed');\nconst close = (a, b) => Math.abs(a - b) <= 1e-12;\nif (!forward.converged) throw new Error('Forward did not converge');\nif (!close(forward.expectedReward.expectedReward, 120)) throw new Error('expectedReward mismatch');\nif (!close(forward.expectedElapsedTime.expectedElapsedTimeSeconds, 90)) throw new Error('expectedElapsedTime mismatch');\nif (!close(forward.rewardRate.rewardPerSecond, 4 / 3)) throw new Error('rewardPerSecond mismatch');\nif (!close(forward.rewardRate.rewardPerHour, 4800)) throw new Error('rewardPerHour mismatch');\nif (!close(forward.reachability.probabilityFromStart, 0.6)) throw new Error('reachability mismatch');\nconst forwardJson = JSON.parse(api.forwardResultHandoffToJson(forward));\nif (!close(forwardJson.expectedReward.expectedReward, 120)) throw new Error('forward JSON handoff mismatch');\n\nconst reverseInput = {\n  schemaVersion: 1,\n  estimationKind: 'discrete_parameter_candidates',\n  modelDocument: {\n    schemaVersion: 1, modelKind: 'base',\n    model: {\n      startState: 'start',\n      states: [{ id: 'start' }, { id: 'success', terminal: true }, { id: 'failure', terminal: true }],\n      parameters: [{ id: 'successProbability' }],\n      transitions: [\n        { from: 'start', to: 'success', probability: { type: 'parameter_ref', parameter: 'successProbability' } },\n        { from: 'start', to: 'failure', probability: { type: 'formula', operator: 'subtract', left: 1, right: { type: 'parameter_ref', parameter: 'successProbability' } } }\n      ]\n    }\n  },\n  observationDataset: {\n    schemaVersion: 1,\n    observations: [\n      { id: 'attempts', type: 'state_count', state: 'start', count: 100 },\n      { id: 'successes', type: 'transition_count', from: 'start', to: 'success', count: 60 },\n      { id: 'failures', type: 'transition_count', from: 'start', to: 'failure', count: 40 }\n    ]\n  },\n  request: {\n    parameterId: 'successProbability',\n    candidates: [0.4, 0.5, 0.6, 0.7],\n    constraints: [{ type: 'minimum', value: 0 }, { type: 'maximum', value: 1 }]\n  }\n};\nconst reverseResult = api.estimateExternalReverseInput(reverseInput);\nconst reverse = api.toReverseResultHandoff(reverseResult);\nif (reverse.status !== 'success') throw new Error('Reverse handoff failed');\nif (reverse.selection.estimatedValue !== 0.6) throw new Error('reverse estimatedValue mismatch');\nif (JSON.stringify(reverse.selection.bestCandidateValues) !== JSON.stringify([0.6])) throw new Error('reverse best candidate mismatch');\nif (reverse.priorUsed !== false || reverse.posteriorComputed !== false) throw new Error('reverse prior/posterior semantics mismatch');\nconst reverseJson = JSON.parse(api.reverseResultHandoffToJson(reverse));\nif (reverseJson.selection.estimatedValue !== 0.6) throw new Error('reverse JSON handoff mismatch');\nconsole.log(JSON.stringify({ forward: 'PASS', reverse: 'PASS' }));\n`,
    'utf8'
  );
}

async function writeConsumerTypeSmoke(tempDir) {
  await writeFile(
    join(tempDir, 'type-smoke.ts'),
    `import {\n  analyzeParameterSensitivity,\n  compareExternalModelScenarios,\n  estimateExternalReverseInput,\n  evaluateAcyclicDirectDefinitionModel,\n  evaluateDefinitionModel,\n  evaluateDefinitionModelWithSolver,\n  evaluateExternalModelInput,\n  evaluateExternalModelJson,\n  toForwardResultHandoff,\n  toReverseResultHandoff,\n  type DefinitionModel,\n  type ForwardResultHandoff,\n  type ForwardSolverRequest,\n  type ObservationDataset,\n  type ReverseResultHandoff\n} from 'universal-calc-engine';\n\nconst model: DefinitionModel = { startState: 'done', states: [{ id: 'done', terminal: true }], transitions: [] };\nconst request: ForwardSolverRequest = { solverMethod: 'iterative' };\nconst observations: ObservationDataset = { schemaVersion: 1, observations: [] };\nvoid model; void request; void observations;\nvoid evaluateDefinitionModel; void evaluateAcyclicDirectDefinitionModel; void evaluateDefinitionModelWithSolver;\nvoid evaluateExternalModelInput; void evaluateExternalModelJson; void estimateExternalReverseInput;\nvoid toForwardResultHandoff; void toReverseResultHandoff; void compareExternalModelScenarios; void analyzeParameterSensitivity;\nlet forward!: ForwardResultHandoff; let reverse!: ReverseResultHandoff; void forward; void reverse;\n`,
    'utf8'
  );
}

async function declarationPathCheck(packageDir) {
  const dist = join(packageDir, 'dist');
  const files = (await listFiles(dist)).filter((path) => path.endsWith('.d.ts'));
  for (const path of files) {
    const source = await readFile(join(dist, path), 'utf8');
    assert(!source.includes('packages/core/src'), 'type_declaration_failure', `${path} references repository source`);
    assert(!source.includes('../packages/'), 'type_declaration_failure', `${path} references unpublished packages path`);
  }
}

async function runConsumerQualification(tarballPath, lockedTypeScriptVersion) {
  const tempDir = await mkdtemp(join(tmpdir(), 'orf-dist-consumer-'));
  try {
    await writeFile(
      join(tempDir, 'package.json'),
      `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
      'utf8'
    );
    run(npmCommand, ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath], tempDir);
    await writeConsumerRuntimeSmoke(tempDir);
    run(nodeCommand, ['runtime-smoke.mjs'], tempDir);

    const deepImport = spawnSync(
      nodeCommand,
      [
        '--input-type=module',
        '-e',
        `import('universal-calc-engine/dist/model.js').then(() => process.exit(2)).catch((error) => { if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') { console.error(error); process.exit(3); } })`
      ],
      { cwd: tempDir, encoding: 'utf8' }
    );
    assertEqual(deepImport.status, 0, 'export_contract_violation', 'deep import rejection exit status');

    await writeConsumerTypeSmoke(tempDir);
    const compilerVersions = ['5.5.4'];
    if (!compilerVersions.includes(lockedTypeScriptVersion)) compilerVersions.push(lockedTypeScriptVersion);
    for (const version of compilerVersions) {
      run(
        npmCommand,
        ['install', '--save-dev', '--ignore-scripts', '--no-audit', '--no-fund', `typescript@${version}`],
        tempDir
      );
      run(
        join(tempDir, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc'),
        [
          '--noEmit',
          '--strict',
          '--target',
          'ES2022',
          '--module',
          'NodeNext',
          '--moduleResolution',
          'NodeNext',
          'type-smoke.ts'
        ],
        tempDir
      );
    }
    await declarationPathCheck(join(tempDir, 'node_modules', 'universal-calc-engine'));
    return { compilerVersions };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function validateDocumentation() {
  const readme = await readFile(join(rootDir, 'README.md'), 'utf8');
  const required = [
    'npm install universal-calc-engine',
    'ESM only',
    "from 'universal-calc-engine'",
    '>=22.14.0 <23',
    '>=24.0.0 <25',
    'TypeScript',
    'COMMERCIAL-LICENSE.md',
    'functional-contract v1',
    'package 1.0.0',
    'subject-public-1df6235d58a5',
    'continuous inference',
    'causal inference',
    'hidden-state inference'
  ];
  for (const text of required) {
    assert(readme.includes(text), 'consumer_documentation_contract_failure', `README missing required distribution text: ${text}`);
  }
  assert(await exists(join(rootDir, 'COMMERCIAL-LICENSE.md')), 'license_artifact_missing', 'COMMERCIAL-LICENSE.md missing');

  const releaseWorkflow = await readFile(join(rootDir, '.github', 'workflows', 'publish-package.yml'), 'utf8');
  for (const text of [
    'package-v*',
    'contents: read',
    'id-token: write',
    'actions/checkout@v6',
    'actions/setup-node@v6',
    'npm publish --tag candidate',
    'https://registry.npmjs.org'
  ]) {
    assert(releaseWorkflow.includes(text), 'consumer_documentation_contract_failure', `release workflow missing: ${text}`);
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  await validateMetadata(packageJson);

  for (const required of ['index.js', 'index.d.ts']) {
    assert(await exists(join(distDir, required)), 'build_failure', `Missing build artifact dist/${required}`);
  }
  const distFiles = await listFiles(distDir);
  for (const path of distFiles) {
    assert(!path.endsWith('.map'), 'pack_content_violation', `map file emitted into dist: ${path}`);
    assert(!path.includes('/test/') && !path.includes('/examples/'), 'pack_content_violation', `development file emitted into dist: ${path}`);
  }

  const apiManifest = await buildApiManifest(packageJson);
  if (generateApiManifest) {
    await mkdir(dirname(apiManifestPath), { recursive: true });
    await writeFile(apiManifestPath, stableJson(apiManifest), 'utf8');
    console.log(stableJson(apiManifest));
    return;
  }
  assert(await exists(apiManifestPath), 'runtime_type_surface_divergence', 'docs/package-api-v1.json missing');
  const committedApiManifest = JSON.parse(await readFile(apiManifestPath, 'utf8'));
  assertEqual(committedApiManifest, apiManifest, 'runtime_type_surface_divergence', 'package API manifest');

  const first = npmPack();
  const firstNormalized = await normalizedManifest(packageJson, first.packed);
  const firstTarballHash = sha256Buffer(await readFile(first.tarballPath));

  run(nodeCommand, [join(rootDir, 'scripts', 'build-package.mjs')], rootDir);
  const second = npmPack();
  const secondNormalized = await normalizedManifest(packageJson, second.packed);
  const secondTarballHash = sha256Buffer(await readFile(second.tarballPath));
  assertEqual(
    secondNormalized.manifest,
    firstNormalized.manifest,
    'reproducibility_mismatch',
    'normalized packed content manifest'
  );

  const lockedTypeScriptVersion = JSON.parse(
    await readFile(join(rootDir, 'node_modules', 'typescript', 'package.json'), 'utf8')
  ).version;
  const consumer = await runConsumerQualification(second.tarballPath, lockedTypeScriptVersion);
  await validateDocumentation();

  const gitSha = process.env.GITHUB_SHA ?? 'local-unpinned';
  const shortSha = gitSha === 'local-unpinned' ? 'local' : gitSha.slice(0, 12);
  const distributionSubjectId = `distribution-subject-public-${shortSha}`;
  const artifactId = `ARTIFACT-NPM-universal-calc-engine-1.0.0-${shortSha}`;
  const resultId = `RESULT-ORF-DIST-${shortSha}-v1`;
  const npmVersion = run(npmCommand, ['--version'], rootDir, true).stdout.trim();

  const evidence = {
    schemaVersion: 1,
    authority: 'ORF-DISTRIBUTION-CONTRACT-v1',
    gate: 'Gate DIST-v1',
    stateCandidate: 'PREPUBLICATION_QUALIFIED',
    analyticalSubject: {
      subjectId: 'subject-public-1df6235d58a5',
      commitSha: '1df6235d58a5027fdae0390f7a73a09cfb4ee1ee',
      analyticalRequalificationPerformed: false
    },
    distribution: {
      distributionSubjectId,
      commitSha: gitSha,
      packageName: packageJson.name,
      packageVersion: packageJson.version,
      registry: 'https://registry.npmjs.org/',
      artifactId,
      qualificationResultId: resultId,
      normalizedManifestSha256: secondNormalized.manifestSha256,
      apiManifestSha256: secondNormalized.manifest.qualifiedApiManifestSha256,
      tarballFilename: basename(second.tarballPath),
      tarballSha256: secondTarballHash,
      firstBuildTarballSha256: firstTarballHash
    },
    environment: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      npm: npmVersion,
      lockedTypeScript: lockedTypeScriptVersion,
      consumerTypeScriptVersions: consumer.compilerVersions
    },
    tests: {
      'DIST-001': 'PASS',
      'DIST-002': 'PASS',
      'DIST-003': 'PASS',
      'DIST-004': 'PASS',
      'DIST-005': 'PASS',
      'DIST-006': 'PASS',
      'DIST-007': 'PASS',
      'DIST-008': 'PASS',
      'DIST-009': 'PASS',
      'DIST-011': 'PASS'
    },
    releaseWorkflowValidation: 'PASS',
    normalizedManifest: secondNormalized.manifest,
    publicAnalyticalScopeExpansion: false,
    newShowcaseCandidateCreated: false,
    showcaseRepositoryCreated: false,
    publicationAuthorized: false,
    published: false
  };

  const evidencePath = join(
    outputDir,
    `distribution-evidence-node-${process.version.replace(/^v/, '')}.json`
  );
  await writeFile(evidencePath, stableJson(evidence), 'utf8');
  const artifactCopy = join(outputDir, basename(second.tarballPath));
  if (resolve(second.tarballPath) !== resolve(artifactCopy)) await cp(second.tarballPath, artifactCopy);
  await writeFile(
    join(outputDir, `normalized-manifest-node-${process.version.replace(/^v/, '')}.json`),
    stableJson(secondNormalized.manifest),
    'utf8'
  );

  if (first.tarballPath !== second.tarballPath && (await exists(first.tarballPath))) {
    await rm(first.tarballPath, { force: true });
  }
  console.log(stableJson(evidence));
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exit(1);
});
