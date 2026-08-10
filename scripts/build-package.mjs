import { spawnSync } from 'node:child_process';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const distDir = join(rootDir, 'dist');
const tscCommand = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit'
  });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function withJavaScriptExtension(specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    return specifier;
  }

  const suffixIndex = specifier.search(/[?#]/);
  const pathname = suffixIndex === -1 ? specifier : specifier.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : specifier.slice(suffixIndex);
  if (extname(pathname) !== '') {
    return specifier;
  }
  return `${pathname}.js${suffix}`;
}

function rewriteRelativeModuleSpecifiers(source) {
  return source
    .replace(
      /(\bfrom\s+)(['"])(\.\.?\/[^'"]+)\2/g,
      (_match, prefix, quote, specifier) =>
        `${prefix}${quote}${withJavaScriptExtension(specifier)}${quote}`
    )
    .replace(
      /(\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]+)\2(\s*\))/g,
      (_match, prefix, quote, specifier, suffix) =>
        `${prefix}${quote}${withJavaScriptExtension(specifier)}${quote}${suffix}`
    )
    .replace(
      /(\bimport\s+)(['"])(\.\.?\/[^'"]+)\2/g,
      (_match, prefix, quote, specifier) =>
        `${prefix}${quote}${withJavaScriptExtension(specifier)}${quote}`
    );
}

async function emittedModuleFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await emittedModuleFiles(path)));
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.d.ts')) {
      result.push(path);
    }
  }
  return result;
}

await rm(distDir, { recursive: true, force: true });
run(tscCommand, ['-p', 'tsconfig.build.json']);

const emittedFiles = await emittedModuleFiles(distDir);
for (const file of emittedFiles) {
  const source = await readFile(file, 'utf8');
  const rewritten = rewriteRelativeModuleSpecifiers(source);
  if (rewritten !== source) {
    await writeFile(file, rewritten, 'utf8');
  }
}

console.log(`Built ${emittedFiles.length} ESM/declaration files in dist/.`);
