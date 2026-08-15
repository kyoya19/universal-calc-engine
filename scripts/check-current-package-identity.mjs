import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const outputDir = join(rootDir, 'qualification-output');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packageJson = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'));
const lifecycle = process.env.ORF_NPM_IDENTITY_LIFECYCLE ?? 'current_generation_prepublication';
const expectedRepository = 'https://github.com/kyoya19/universal-calc-engine';
const historicalIdentity = {
  name: 'universal-calc-engine',
  version: '1.0.0',
  integrity: 'sha512-+SvfAWnXyQsKX/M3SCj/GmJWSpR2vZHc+tw6DeYjYgA8ZEM769t0t9pX8ZomTUVG0fpTk24Ee6v9IHrPdeE25w==',
  shasum: '0557af9ca092b703b4ea6f5e424e7d3eb607d60b'
};
const prospectiveIdentity = {
  name: 'universal-calc-engine',
  version: '1.1.0',
  analyticalSubject: 'subject-public-8b341032516a',
  analyticalCommit: '8b341032516a2f5108170743c4dafd8fde31a229'
};

await mkdir(outputDir, { recursive: true });

function runView(spec) {
  return spawnSync(npmCommand, ['view', spec, '--json'], { cwd: rootDir, encoding: 'utf8' });
}

function isNotFound(result) {
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  return result.status !== 0 && (/E404/.test(text) || /404 Not Found/.test(text) || /No match found for version/.test(text) || /is not in this registry/.test(text));
}

function parse(result) {
  try {
    return JSON.parse(result.stdout || 'null');
  } catch {
    return null;
  }
}

function normalizeRepository(repository) {
  const value = typeof repository === 'string' ? repository : repository?.url;
  if (typeof value !== 'string') return null;
  return value
    .trim()
    .replace(/^git\+/, '')
    .replace(/^git:\/\/github\.com\//, 'https://github.com/')
    .replace(/^ssh:\/\/git@github\.com\//, 'https://github.com/')
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/^github:/, 'https://github.com/')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
}

function assert(condition, message) {
  if (!condition) throw new Error(`distribution_identity_mismatch: ${message}`);
}

async function finish(evidence) {
  await writeFile(join(outputDir, 'npm-identity.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(evidence, null, 2));
}

if (!['current_generation_prepublication', 'current_generation_published_verified'].includes(lifecycle)) {
  throw new Error(`distribution_identity_lifecycle_invalid: ${lifecycle}`);
}

assert(packageJson.name === prospectiveIdentity.name, 'local package name');
assert(packageJson.version === prospectiveIdentity.version, 'local package version');
assert(normalizeRepository(packageJson.repository) === expectedRepository, 'local repository');
assert(packageJson.orfs?.distributionContract === 'ORF-DISTRIBUTION-CONTRACT-v1', 'local distribution contract');
assert(packageJson.orfs?.analyticalSubject === prospectiveIdentity.analyticalSubject, 'local analytical subject');
assert(packageJson.orfs?.analyticalCommit === prospectiveIdentity.analyticalCommit, 'local analytical commit');

const packageResult = runView(prospectiveIdentity.name);
assert(packageResult.status === 0, 'package-level registry lookup failed');
const packageMetadata = parse(packageResult);
assert(packageMetadata?.name === prospectiveIdentity.name, 'registry package name');
assert(normalizeRepository(packageMetadata?.repository) === expectedRepository, 'registry package repository');

const historicalResult = runView(`${historicalIdentity.name}@${historicalIdentity.version}`);
assert(historicalResult.status === 0, 'historical 1.0.0 registry lookup failed');
const historicalMetadata = parse(historicalResult);
assert(historicalMetadata?.name === historicalIdentity.name, 'historical package name');
assert(historicalMetadata?.version === historicalIdentity.version, 'historical package version');
assert(normalizeRepository(historicalMetadata?.repository) === expectedRepository, 'historical repository');
assert(historicalMetadata?.dist?.integrity === historicalIdentity.integrity, 'historical dist.integrity');
assert(historicalMetadata?.dist?.shasum === historicalIdentity.shasum, 'historical dist.shasum');

const prospectiveResult = runView(`${prospectiveIdentity.name}@${prospectiveIdentity.version}`);

if (lifecycle === 'current_generation_prepublication') {
  assert(isNotFound(prospectiveResult), '1.1.0 must remain absent before publication');
  const versions = Array.isArray(packageMetadata?.versions) ? packageMetadata.versions : [packageMetadata?.versions].filter(Boolean);
  assert(versions.includes('1.0.0'), 'package versions must include historical 1.0.0');
  assert(!versions.includes('1.1.0'), 'package versions unexpectedly include 1.1.0');
  assert(packageMetadata?.['dist-tags']?.latest === '1.0.0', 'prepublication latest must remain 1.0.0');
  await finish({
    schemaVersion: 1,
    testId: 'CURRENT-DIST-IDENTITY',
    lifecycle,
    status: 'PASS',
    packageName: prospectiveIdentity.name,
    prospectiveVersion: prospectiveIdentity.version,
    prospectiveVersionState: 'ABSENT_VERIFIED',
    registryVersions: versions,
    registryDistTags: packageMetadata['dist-tags'],
    repository: expectedRepository,
    historicalIdentity: {
      version: historicalIdentity.version,
      integrity: historicalMetadata.dist.integrity,
      shasum: historicalMetadata.dist.shasum,
      status: 'UNCHANGED_PASS'
    }
  });
} else {
  assert(prospectiveResult.status === 0, 'published 1.1.0 registry lookup failed');
  const prospectiveMetadata = parse(prospectiveResult);
  assert(prospectiveMetadata?.name === prospectiveIdentity.name, 'published package name');
  assert(prospectiveMetadata?.version === prospectiveIdentity.version, 'published package version');
  assert(normalizeRepository(prospectiveMetadata?.repository) === expectedRepository, 'published repository');
  assert(typeof prospectiveMetadata?.dist?.integrity === 'string', 'published dist.integrity missing');
  assert(typeof prospectiveMetadata?.dist?.shasum === 'string', 'published dist.shasum missing');
  assert(packageMetadata?.['dist-tags']?.latest === '1.1.0', 'postpublication latest must be 1.1.0');
  await finish({
    schemaVersion: 1,
    testId: 'CURRENT-DIST-IDENTITY',
    lifecycle,
    status: 'PASS',
    packageName: prospectiveIdentity.name,
    prospectiveVersion: prospectiveIdentity.version,
    registryDistTags: packageMetadata['dist-tags'],
    prospectiveRegistry: {
      integrity: prospectiveMetadata.dist.integrity,
      shasum: prospectiveMetadata.dist.shasum,
      attestations: prospectiveMetadata.dist.attestations ?? null
    },
    historicalIdentity: {
      version: historicalIdentity.version,
      integrity: historicalMetadata.dist.integrity,
      shasum: historicalMetadata.dist.shasum,
      status: 'UNCHANGED_PASS'
    }
  });
}
