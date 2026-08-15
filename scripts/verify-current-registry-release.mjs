import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packageName = 'universal-calc-engine';
const packageVersion = '1.1.0';
const expectedRepository = 'https://github.com/kyoya19/universal-calc-engine';
const historicalIntegrity = 'sha512-+SvfAWnXyQsKX/M3SCj/GmJWSpR2vZHc+tw6DeYjYgA8ZEM769t0t9pX8ZomTUVG0fpTk24Ee6v9IHrPdeE25w==';
const historicalShasum = '0557af9ca092b703b4ea6f5e424e7d3eb607d60b';
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

function fail(message) {
  throw new Error(`registry_postpublish_mismatch: ${message}`);
}

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    if (capture) {
      process.stderr.write(result.stdout ?? '');
      process.stderr.write(result.stderr ?? '');
    }
    fail(`${command} ${args.join(' ')} exited ${String(result.status)}`);
  }
  return result;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function normalizeRepository(repository) {
  const value = typeof repository === 'string' ? repository : repository?.url;
  if (typeof value !== 'string') return null;
  return value.trim().replace(/^git\+/, '').replace(/^git:\/\/github\.com\//, 'https://github.com/').replace(/\.git$/, '').replace(/\/$/, '');
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

async function normalizedInstalledManifest(packageDir) {
  const files = [];
  for (const path of await listFiles(packageDir)) {
    if (path === 'node_modules' || path.startsWith('node_modules/')) continue;
    const bytes = await readFile(join(packageDir, path));
    files.push({ path, size: bytes.length, sha256: sha256(bytes) });
  }
  return files;
}

const prepublicationManifestPath = process.env.ORF_PREPUBLICATION_MANIFEST;
const prepublicationTarballHashPath = process.env.ORF_PREPUBLICATION_TARBALL_SHA256;
if (!prepublicationManifestPath) fail('ORF_PREPUBLICATION_MANIFEST is required');
if (!prepublicationTarballHashPath) fail('ORF_PREPUBLICATION_TARBALL_SHA256 is required');
const prepublication = JSON.parse(await readFile(prepublicationManifestPath, 'utf8'));
const expectedTarballSha256 = (await readFile(prepublicationTarballHashPath, 'utf8')).trim();

const tempDir = await mkdtemp(join(tmpdir(), 'orf-current-registry-consumer-'));
try {
  await writeFile(join(tempDir, 'package.json'), `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`, 'utf8');
  run(npmCommand, ['install', '--ignore-scripts', '--no-audit', '--no-fund', `${packageName}@${packageVersion}`], tempDir);

  await writeFile(
    join(tempDir, 'smoke.mjs'),
    `import * as api from 'universal-calc-engine';\nconst required=${JSON.stringify(showcaseRequiredRuntimeFunctions)};\nfor(const name of required){if(typeof api[name]!=='function')throw new Error('Missing Showcase-required runtime export '+name);}\nfor(const name of ['evaluateExternalModelJson','estimateExternalReverseInput','toForwardResultHandoff','toReverseResultHandoff']){if(typeof api[name]!=='function')throw new Error('Missing compatibility runtime export '+name);}\nconsole.log(JSON.stringify({rootEsmImport:'PASS',showcaseRequiredApis:'PASS'}));\n`,
    'utf8'
  );
  run(process.execPath, ['smoke.mjs'], tempDir);

  run(npmCommand, ['install', '--save-dev', '--ignore-scripts', '--no-audit', '--no-fund', 'typescript@5.5.4'], tempDir);
  await writeFile(
    join(tempDir, 'smoke.ts'),
    `import { analyzeFiniteAdditiveTrajectoryFunctionalDistribution, analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence, analyzeFiniteHorizonFirstPassage, analyzeFiniteMarkovLongRunBehavior, classifyFiniteModelFamilyIdentifiability, conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue, inferFiniteHiddenObservationCandidates, propagateFiniteHorizonStateDistribution, reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories, selectFiniteAmbiguityPreservingRobustActions, evaluateExternalModelJson, estimateExternalReverseInput, type DefinitionModel } from 'universal-calc-engine';\nconst runtime=[analyzeFiniteAdditiveTrajectoryFunctionalDistribution,analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence,analyzeFiniteHorizonFirstPassage,analyzeFiniteMarkovLongRunBehavior,classifyFiniteModelFamilyIdentifiability,conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue,inferFiniteHiddenObservationCandidates,propagateFiniteHorizonStateDistribution,reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories,selectFiniteAmbiguityPreservingRobustActions,evaluateExternalModelJson,estimateExternalReverseInput]; void runtime; let model!:DefinitionModel; void model;\n`,
    'utf8'
  );
  run(
    join(tempDir, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc'),
    ['--noEmit', '--strict', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'smoke.ts'],
    tempDir
  );

  const installedDir = join(tempDir, 'node_modules', packageName);
  const installedPackage = JSON.parse(await readFile(join(installedDir, 'package.json'), 'utf8'));
  if (installedPackage.name !== packageName || installedPackage.version !== packageVersion) fail('installed package identity/version mismatch');
  if (normalizeRepository(installedPackage.repository) !== expectedRepository) fail('installed package repository mismatch');
  const installedFiles = await normalizedInstalledManifest(installedDir);
  const expectedFiles = prepublication.files.map(({ path, size, sha256 }) => ({ path, size, sha256 }));
  if (JSON.stringify(installedFiles) !== JSON.stringify(expectedFiles)) fail('registry-installed package content differs from prepublication normalized manifest');

  const registry = JSON.parse(run(npmCommand, ['view', `${packageName}@${packageVersion}`, '--json'], tempDir, true).stdout);
  if (registry.name !== packageName || registry.version !== packageVersion) fail('registry metadata mismatch');
  if (normalizeRepository(registry.repository) !== expectedRepository) fail('registry repository mismatch');
  if (typeof registry.dist?.integrity !== 'string') fail('registry dist.integrity missing');
  if (typeof registry.dist?.shasum !== 'string') fail('registry dist.shasum missing');
  if (registry['dist-tags']?.latest !== packageVersion) fail('latest dist-tag mismatch');
  if (!registry.dist?.attestations) fail('registry provenance/attestation metadata missing');

  const historical = JSON.parse(run(npmCommand, ['view', `${packageName}@1.0.0`, '--json'], tempDir, true).stdout);
  if (historical.dist?.integrity !== historicalIntegrity || historical.dist?.shasum !== historicalShasum) fail('historical 1.0.0 identity changed');

  const packResult = JSON.parse(run(npmCommand, ['pack', `${packageName}@${packageVersion}`, '--json'], tempDir, true).stdout);
  if (!Array.isArray(packResult) || packResult.length !== 1) fail('registry npm pack result invalid');
  const registryTarballPath = join(tempDir, packResult[0].filename);
  const registryTarballSha256 = sha256(await readFile(registryTarballPath));
  if (registryTarballSha256 !== expectedTarballSha256) fail('registry tarball SHA-256 differs from qualified tarball');

  const evidence = {
    schemaVersion: 1,
    testId: 'CURRENT-DIST-POSTPUBLISH',
    status: 'PASS',
    packageName,
    packageVersion,
    nodeVersion: process.version,
    registry: {
      repository: normalizeRepository(registry.repository),
      integrity: registry.dist.integrity,
      shasum: registry.dist.shasum,
      attestations: registry.dist.attestations,
      latest: registry['dist-tags'].latest
    },
    tarballSha256: registryTarballSha256,
    qualifiedTarballEquivalence: 'PASS_EXACT_SHA256',
    installedFileManifest: 'PASS_EXACT_MATCH',
    rootEsmImport: 'PASS',
    showcaseRequiredApiAvailability: 'PASS',
    typeScriptDeclarationConsumer: 'PASS',
    historical1_0_0: 'UNCHANGED_PASS'
  };
  await writeFile(join(process.cwd(), 'qualification-output', `current-generation-postpublish-node-${process.version.replace(/^v/, '')}.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
