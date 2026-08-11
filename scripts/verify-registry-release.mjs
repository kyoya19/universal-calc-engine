import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const packageName = 'universal-calc-engine';
const packageVersion = '1.0.0';

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
  const paths = await listFiles(packageDir);
  const files = [];
  for (const path of paths) {
    if (path === 'node_modules' || path.startsWith('node_modules/')) continue;
    const bytes = await readFile(join(packageDir, path));
    files.push({ path, size: bytes.length, sha256: sha256(bytes) });
  }
  return files;
}

const tempDir = await mkdtemp(join(tmpdir(), 'orf-dist-registry-consumer-'));
try {
  await writeFile(
    join(tempDir, 'package.json'),
    `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
    'utf8'
  );
  run(
    npmCommand,
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', `${packageName}@${packageVersion}`],
    tempDir
  );

  await writeFile(
    join(tempDir, 'smoke.mjs'),
    `import * as api from 'universal-calc-engine';\nconst required=['evaluateExternalModelJson','estimateExternalReverseInput','toForwardResultHandoff','toReverseResultHandoff'];\nfor(const name of required){if(typeof api[name]!=='function')throw new Error('Missing runtime export '+name);}\nconst forwardInput={schemaVersion:1,modelKind:'base',parameterValues:{successProbability:.6,successReward:200,attemptMinutes:1.5},model:{startState:'start',states:[{id:'start'},{id:'success',terminal:true},{id:'failure',terminal:true}],parameters:[{id:'successProbability'},{id:'successReward',unit:'points'},{id:'attemptMinutes',unit:'minutes'}],transitions:[{from:'start',to:'success',probability:{type:'parameter_ref',parameter:'successProbability'},reward:{type:'parameter_ref',parameter:'successReward'},elapsedTime:{value:{type:'parameter_ref',parameter:'attemptMinutes'},unit:'minutes'}},{from:'start',to:'failure',probability:{type:'formula',operator:'subtract',left:1,right:{type:'parameter_ref',parameter:'successProbability'}},elapsedTime:{value:{type:'parameter_ref',parameter:'attemptMinutes'},unit:'minutes'}}]}};\nconst f=api.toForwardResultHandoff(api.evaluateExternalModelJson(JSON.stringify(forwardInput),{reachabilityTargets:['success']}));\nif(f.status!=='success'||Math.abs(f.expectedReward.expectedReward-120)>1e-12||Math.abs(f.expectedElapsedTime.expectedElapsedTimeSeconds-90)>1e-12||Math.abs(f.rewardRate.rewardPerHour-4800)>1e-12||Math.abs(f.reachability.probabilityFromStart-.6)>1e-12)throw new Error('Forward registry smoke mismatch');\nconst reverseInput={schemaVersion:1,estimationKind:'discrete_parameter_candidates',modelDocument:{schemaVersion:1,modelKind:'base',model:{startState:'start',states:[{id:'start'},{id:'success',terminal:true},{id:'failure',terminal:true}],parameters:[{id:'successProbability'}],transitions:[{from:'start',to:'success',probability:{type:'parameter_ref',parameter:'successProbability'}},{from:'start',to:'failure',probability:{type:'formula',operator:'subtract',left:1,right:{type:'parameter_ref',parameter:'successProbability'}}}]}},observationDataset:{schemaVersion:1,observations:[{id:'attempts',type:'state_count',state:'start',count:100},{id:'successes',type:'transition_count',from:'start',to:'success',count:60},{id:'failures',type:'transition_count',from:'start',to:'failure',count:40}]},request:{parameterId:'successProbability',candidates:[.4,.5,.6,.7],constraints:[{type:'minimum',value:0},{type:'maximum',value:1}]}};\nconst r=api.toReverseResultHandoff(api.estimateExternalReverseInput(reverseInput));\nif(r.status!=='success'||r.selection.estimatedValue!==.6||JSON.stringify(r.selection.bestCandidateValues)!=='[0.6]'||r.priorUsed!==false||r.posteriorComputed!==false)throw new Error('Reverse registry smoke mismatch');\nconsole.log('DIST-012 runtime smoke PASS');\n`,
    'utf8'
  );
  run(process.execPath, ['smoke.mjs'], tempDir);

  run(npmCommand, ['install', '--save-dev', '--ignore-scripts', '--no-audit', '--no-fund', 'typescript@5.5.4'], tempDir);
  await writeFile(
    join(tempDir, 'smoke.ts'),
    `import { evaluateExternalModelJson, estimateExternalReverseInput, type DefinitionModel, type ForwardResultHandoff, type ReverseResultHandoff } from 'universal-calc-engine';\nlet model!: DefinitionModel; let f!: ForwardResultHandoff; let r!: ReverseResultHandoff; void model; void f; void r; void evaluateExternalModelJson; void estimateExternalReverseInput;\n`,
    'utf8'
  );
  run(
    join(tempDir, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc'),
    ['--noEmit', '--strict', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'smoke.ts'],
    tempDir
  );

  const installedDir = join(tempDir, 'node_modules', packageName);
  const installedPackage = JSON.parse(await readFile(join(installedDir, 'package.json'), 'utf8'));
  if (installedPackage.name !== packageName || installedPackage.version !== packageVersion) {
    fail('installed package identity/version mismatch');
  }
  await readFile(join(installedDir, 'COMMERCIAL-LICENSE.md'));

  const prepublication = process.env.ORF_PREPUBLICATION_MANIFEST;
  if (!prepublication) fail('ORF_PREPUBLICATION_MANIFEST is required');
  const pre = JSON.parse(await readFile(prepublication, 'utf8'));
  const installedFiles = await normalizedInstalledManifest(installedDir);
  const expectedFiles = pre.files.map(({ path, size, sha256 }) => ({ path, size, sha256 }));
  if (JSON.stringify(installedFiles) !== JSON.stringify(expectedFiles)) {
    fail('registry-installed package content differs from prepublication normalized manifest');
  }

  const registry = JSON.parse(
    run(npmCommand, ['view', `${packageName}@${packageVersion}`, 'name', 'version', 'repository', 'dist', 'dist-tags', '--json'], tempDir, true).stdout
  );
  if (registry.name !== packageName || registry.version !== packageVersion) fail('registry metadata mismatch');
  if (!registry.dist?.integrity) fail('registry dist.integrity missing');

  const evidence = {
    schemaVersion: 1,
    testId: 'DIST-012',
    status: 'PASS',
    packageName,
    packageVersion,
    registry,
    installedFileCount: installedFiles.length
  };
  await writeFile(join(process.cwd(), 'qualification-output', 'DIST-012.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
