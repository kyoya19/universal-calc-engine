import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const outputDir = join(rootDir, 'qualification-output');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packageName = 'universal-calc-engine';

await mkdir(outputDir, { recursive: true });

const result = spawnSync(
  npmCommand,
  ['view', packageName, 'name', 'version', 'repository', '--json'],
  { cwd: rootDir, encoding: 'utf8' }
);

const text = `${result.stdout ?? ''}${result.stderr ?? ''}`;
const notFound =
  result.status !== 0 &&
  (/E404/.test(text) || /404 Not Found/.test(text) || /is not in this registry/.test(text));

let evidence;
if (notFound) {
  evidence = {
    schemaVersion: 1,
    testId: 'DIST-IDENTITY',
    packageName,
    registry: 'https://registry.npmjs.org/',
    status: 'PASS',
    identityState: 'unregistered',
    ownershipConfirmationRequired: false
  };
} else if (result.status === 0) {
  let registryMetadata = null;
  try {
    registryMetadata = JSON.parse(result.stdout || 'null');
  } catch {
    registryMetadata = { raw: result.stdout };
  }

  if (process.env.ORF_NPM_IDENTITY_OWNERSHIP_CONFIRMED !== 'true') {
    evidence = {
      schemaVersion: 1,
      testId: 'DIST-IDENTITY',
      packageName,
      registry: 'https://registry.npmjs.org/',
      status: 'BLOCKED_PACKAGE_IDENTITY',
      identityState: 'registered',
      registryMetadata,
      ownershipConfirmationRequired: true,
      classification: 'distribution_identity_collision'
    };
    await writeFile(
      join(outputDir, 'npm-identity.json'),
      `${JSON.stringify(evidence, null, 2)}\n`,
      'utf8'
    );
    console.error(JSON.stringify(evidence, null, 2));
    process.exit(2);
  }

  evidence = {
    schemaVersion: 1,
    testId: 'DIST-IDENTITY',
    packageName,
    registry: 'https://registry.npmjs.org/',
    status: 'PASS',
    identityState: 'registered_authorized_publisher_confirmed',
    registryMetadata,
    ownershipConfirmationRequired: false
  };
} else {
  evidence = {
    schemaVersion: 1,
    testId: 'DIST-IDENTITY',
    packageName,
    registry: 'https://registry.npmjs.org/',
    status: 'ERROR',
    classification: 'registry_identity_check_error',
    exitCode: result.status,
    output: text
  };
  await writeFile(
    join(outputDir, 'npm-identity.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8'
  );
  console.error(JSON.stringify(evidence, null, 2));
  process.exit(result.status ?? 1);
}

await writeFile(
  join(outputDir, 'npm-identity.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8'
);
console.log(JSON.stringify(evidence, null, 2));
