import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const outputDir = join(rootDir, 'qualification-output');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packageJson = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'));
const packageName = packageJson.name;
const packageVersion = packageJson.version;
const lifecycle = process.env.ORF_NPM_IDENTITY_LIFECYCLE ?? 'prepublication';

const publishedVerifiedIdentity = {
  packageName: 'universal-calc-engine',
  version: '1.0.0',
  repository: 'https://github.com/kyoya19/universal-calc-engine',
  integrity:
    'sha512-+SvfAWnXyQsKX/M3SCj/GmJWSpR2vZHc+tw6DeYjYgA8ZEM769t0t9pX8ZomTUVG0fpTk24Ee6v9IHrPdeE25w==',
  distributionContract: 'ORF-DISTRIBUTION-CONTRACT-v1',
  analyticalSubject: 'subject-public-1df6235d58a5',
  analyticalCommit: '1df6235d58a5027fdae0390f7a73a09cfb4ee1ee'
};

await mkdir(outputDir, { recursive: true });

function runView(spec) {
  return spawnSync(
    npmCommand,
    ['view', spec, 'name', 'version', 'repository', 'dist.integrity', '--json'],
    { cwd: rootDir, encoding: 'utf8' }
  );
}

function isNotFound(result) {
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  return (
    result.status !== 0 &&
    (/E404/.test(text) || /404 Not Found/.test(text) || /is not in this registry/.test(text))
  );
}

function parseRegistryMetadata(result) {
  try {
    return JSON.parse(result.stdout || 'null');
  } catch {
    return { raw: result.stdout };
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

function registryIntegrity(metadata) {
  return metadata?.['dist.integrity'] ?? metadata?.dist?.integrity ?? null;
}

async function finish(evidence, exitCode = 0) {
  await writeFile(
    join(outputDir, 'npm-identity.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8'
  );

  const output = JSON.stringify(evidence, null, 2);
  if (exitCode === 0) console.log(output);
  else console.error(output);

  if (exitCode !== 0) process.exit(exitCode);
}

if (!['prepublication', 'published_verified'].includes(lifecycle)) {
  await finish(
    {
      schemaVersion: 1,
      testId: 'DIST-IDENTITY',
      packageName,
      packageVersion,
      registry: 'https://registry.npmjs.org/',
      status: 'ERROR',
      classification: 'distribution_identity_lifecycle_invalid',
      lifecycle
    },
    2
  );
}

const packageResult = runView(packageName);

if (isNotFound(packageResult)) {
  if (lifecycle === 'published_verified') {
    await finish(
      {
        schemaVersion: 1,
        testId: 'DIST-IDENTITY',
        packageName,
        packageVersion,
        registry: 'https://registry.npmjs.org/',
        status: 'FAIL',
        lifecycle,
        identityState: 'expected_published_package_missing',
        classification: 'registry_postpublish_mismatch'
      },
      2
    );
  }

  await finish({
    schemaVersion: 1,
    testId: 'DIST-IDENTITY',
    packageName,
    packageVersion,
    registry: 'https://registry.npmjs.org/',
    status: 'PASS',
    lifecycle,
    identityState: 'unregistered',
    ownershipConfirmationRequired: false
  });
}

if (packageResult.status !== 0) {
  await finish(
    {
      schemaVersion: 1,
      testId: 'DIST-IDENTITY',
      packageName,
      packageVersion,
      registry: 'https://registry.npmjs.org/',
      status: 'ERROR',
      lifecycle,
      classification: 'registry_identity_check_error',
      exitCode: packageResult.status,
      output: `${packageResult.stdout ?? ''}${packageResult.stderr ?? ''}`
    },
    packageResult.status ?? 1
  );
}

const registryMetadata = parseRegistryMetadata(packageResult);

if (lifecycle === 'prepublication') {
  if (process.env.ORF_NPM_IDENTITY_OWNERSHIP_CONFIRMED !== 'true') {
    await finish(
      {
        schemaVersion: 1,
        testId: 'DIST-IDENTITY',
        packageName,
        packageVersion,
        registry: 'https://registry.npmjs.org/',
        status: 'BLOCKED_PACKAGE_IDENTITY',
        lifecycle,
        identityState: 'registered',
        registryMetadata,
        ownershipConfirmationRequired: true,
        classification: 'distribution_identity_collision'
      },
      2
    );
  }

  await finish({
    schemaVersion: 1,
    testId: 'DIST-IDENTITY',
    packageName,
    packageVersion,
    registry: 'https://registry.npmjs.org/',
    status: 'PASS',
    lifecycle,
    identityState: 'registered_authorized_publisher_confirmed',
    registryMetadata,
    ownershipConfirmationRequired: false
  });
}

const exactResult = runView(`${packageName}@${packageVersion}`);
if (isNotFound(exactResult)) {
  await finish(
    {
      schemaVersion: 1,
      testId: 'DIST-IDENTITY',
      packageName,
      packageVersion,
      registry: 'https://registry.npmjs.org/',
      status: 'FAIL',
      lifecycle,
      identityState: 'expected_published_version_missing',
      registryMetadata,
      classification: 'registry_postpublish_mismatch'
    },
    2
  );
}

if (exactResult.status !== 0) {
  await finish(
    {
      schemaVersion: 1,
      testId: 'DIST-IDENTITY',
      packageName,
      packageVersion,
      registry: 'https://registry.npmjs.org/',
      status: 'ERROR',
      lifecycle,
      classification: 'registry_identity_check_error',
      exitCode: exactResult.status,
      output: `${exactResult.stdout ?? ''}${exactResult.stderr ?? ''}`
    },
    exactResult.status ?? 1
  );
}

const exactMetadata = parseRegistryMetadata(exactResult);
const localRepository = normalizeRepository(packageJson.repository);
const observedRepository = normalizeRepository(exactMetadata?.repository);
const observedIntegrity = registryIntegrity(exactMetadata);
const localOrfs = packageJson.orfs ?? {};

const localCanonicalMatch =
  packageName === publishedVerifiedIdentity.packageName &&
  packageVersion === publishedVerifiedIdentity.version &&
  localRepository === publishedVerifiedIdentity.repository &&
  localOrfs.distributionContract === publishedVerifiedIdentity.distributionContract &&
  localOrfs.analyticalSubject === publishedVerifiedIdentity.analyticalSubject &&
  localOrfs.analyticalCommit === publishedVerifiedIdentity.analyticalCommit;

const registryCanonicalMatch =
  exactMetadata?.name === publishedVerifiedIdentity.packageName &&
  exactMetadata?.version === publishedVerifiedIdentity.version &&
  observedRepository === publishedVerifiedIdentity.repository &&
  observedIntegrity === publishedVerifiedIdentity.integrity;

if (!localCanonicalMatch || !registryCanonicalMatch) {
  const repositoryCollision =
    observedRepository !== null && observedRepository !== publishedVerifiedIdentity.repository;

  await finish(
    {
      schemaVersion: 1,
      testId: 'DIST-IDENTITY',
      packageName,
      packageVersion,
      registry: 'https://registry.npmjs.org/',
      status: 'FAIL',
      lifecycle,
      identityState: 'registered_but_not_canonical_published_identity',
      registryMetadata: exactMetadata,
      expectedPublishedIdentity: publishedVerifiedIdentity,
      localCanonicalMatch,
      registryCanonicalMatch,
      ownershipConfirmationRequired: false,
      classification: repositoryCollision
        ? 'distribution_identity_collision'
        : 'registry_postpublish_mismatch'
    },
    2
  );
}

await finish({
  schemaVersion: 1,
  testId: 'DIST-IDENTITY',
  packageName,
  packageVersion,
  registry: 'https://registry.npmjs.org/',
  status: 'PASS',
  lifecycle,
  identityState: 'registered_canonical_published_verified',
  registryMetadata: exactMetadata,
  expectedPublishedIdentity: publishedVerifiedIdentity,
  ownershipConfirmationRequired: false
});
