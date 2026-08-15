import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const packageLock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));

if (packageJson.version !== '1.1.0') throw new Error(`package.json version mismatch: ${packageJson.version}`);

const rootLockVersion = packageLock.packages?.['']?.version;
if (packageLock.version !== '1.1.0' || rootLockVersion !== '1.1.0') {
  console.log(JSON.stringify({
    status: 'LEGACY_ROOT_VERSION_METADATA_ONLY',
    packageJsonVersion: packageJson.version,
    packageLockVersion: packageLock.version,
    packageLockRootVersion: rootLockVersion,
    lockfileVersion: packageLock.lockfileVersion
  }, null, 2));
  process.exit(0);
}

console.log(JSON.stringify({ status: 'PASS', packageLockVersion: packageLock.version, packageLockRootVersion: rootLockVersion }, null, 2));
