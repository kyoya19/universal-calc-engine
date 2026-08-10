# Package distribution readiness

## Purpose

The analytical core already has a functional-contract v1 boundary. This document defines the separate package/build, dependency-lock, and packed-consumer boundary used to hand the repository to a third party that needs a consumable JavaScript library artifact.

This work does **not** publish the package to an npm registry and does not declare a semantic-version `1.0.0` release.

## Package status

The root package remains:

```text
name: universal-calc-engine
version: 0.0.1
private: true
type: module
```

The existing commercial-use terms remain in `COMMERCIAL-LICENSE.md`. The packed artifact includes that file and the root `README.md`; no license text is rewritten by the build.

## Production entrypoint and build

The source public surface remains:

```text
packages/core/src/index.ts
```

The production build emits:

```text
dist/index.js
dist/index.d.ts
```

and package metadata points `main`, `module`, `types`, and the root `exports` entry at those files.

The package is ESM-only at this boundary. No CommonJS build is claimed.

Production build configuration is isolated in `tsconfig.build.json` and includes only:

```text
packages/core/src/**/*.ts
```

so tests, examples, and Vitest configuration are not emitted into `dist/`.

Source files use Bundler-style extensionless relative specifiers. The production build rewrites only generated JavaScript and declaration-file relative specifiers to executable `.js` paths so Node ESM runtime resolution and NodeNext declaration resolution match. Source imports are not mass-edited.

## Dependency lock and reproducible install

The repository commits an npm-generated `package-lock.json` with:

```text
lockfileVersion: 3
```

CI installs the committed graph with:

```text
npm ci --no-audit --no-fund
```

The lockfile is a repository/development input. The package smoke test explicitly fails if `package-lock.json` appears in the packed tarball.

The root package has no `dependencies` field and therefore no declared runtime dependency packages. Direct dependencies remain development-only:

```text
@types/node
TypeScript
Vitest
```

After the Vitest 4 security upgrade, the key resolved versions are:

```text
@types/node: 20.19.43
TypeScript: 5.9.3
Vitest: 4.1.10
Vite: 8.2.1
vite-node: absent
esbuild: absent
```

The packed library consumer smoke test installs only the packed `universal-calc-engine` artifact and successfully imports the runtime API, verifying that the emitted production graph does not rely on undeclared external runtime packages.

## Security audit boundary

Before the Vitest 4 upgrade, the complete development dependency graph reported:

```text
critical: 1
high: 1
moderate: 2
low: 0
```

Those advisories were development-only and came from the Vitest 1.x / Vite 5 / vite-node / esbuild toolchain.

Vitest was upgraded through an explicit compatibility increment to Vitest 4.1.10 and the lockfile was regenerated with npm tooling. No `npm audit fix --force` was used.

The upgraded complete dependency graph reports:

```text
critical: 0
high: 0
moderate: 0
low: 0
total: 0
```

The production-only audit also remains at zero vulnerabilities:

```text
npm audit --omit=dev
→ 0 vulnerabilities
```

CI retains the production dependency security gate:

```text
npm run audit:production
```

which executes:

```text
npm audit --omit=dev --audit-level=moderate
```

Vitest 4 requires Node.js 20 or newer. Its resolved Vite 8 dependency requires Node.js 20.19+ or 22.12+. CI uses Node 20 and the compatibility validation ran on Node 20.20.2, so no repository Node-version change was required for the test-runner upgrade.

## Commands and CI boundary

Development checks:

```text
npm run typecheck
npm test
```

Production dependency security check:

```text
npm run audit:production
```

Production artifact build:

```text
npm run build
```

Packed consumer verification:

```text
npm run package:check
```

CI runs the boundaries in order:

```text
npm ci
→ production dependency audit
→ typecheck
→ test
→ build
→ package smoke test
```

The Vitest 4 compatibility validation preserved the existing baseline:

```text
177 test files passed
1025 tests passed
92 ESM/declaration files emitted
95 packed files
runtime Node ESM import passed
NodeNext declaration resolution passed
```

## Package smoke test

`npm run package:check` performs an actual package boundary check rather than importing source files directly. It:

1. verifies `dist/index.js` and `dist/index.d.ts`,
2. runs `npm pack --json`,
3. checks the tarball file list,
4. rejects source/tests/examples/scripts/build configuration and `package-lock.json` leaking into the packed package,
5. installs the generated tarball into a temporary consumer project with install scripts disabled,
6. imports the installed package with Node ESM,
7. verifies representative forward, direct, dispatcher, reverse, and handoff runtime exports,
8. compiles a separate TypeScript consumer with `moduleResolution: NodeNext`, and
9. removes the temporary consumer and tarball.

Representative runtime exports checked include:

```text
evaluateDefinitionModel
evaluateAcyclicDirectDefinitionModel
evaluateDefinitionModelWithSolver
estimateExternalReverseInput
toForwardResultHandoff
toReverseResultHandoff
```

## Packed files

The package `files` boundary is limited to:

```text
dist
README.md
COMMERCIAL-LICENSE.md
```

`package.json` is included by npm packaging semantics. Tests, examples, `.github`, scripts, TypeScript configs, Vitest config, and the repository lockfile are not intended package payload.

## Existing contracts unchanged

Distribution, dependency-lock, and test-runner maintenance do not change:

```text
DefinitionModel
ForwardEvaluationOptions
ForwardEvaluationResult
ForwardResultHandoff schemaVersion: 1
reverse estimator semantics
ReverseResultHandoff
FiniteDecisionProcess P0
materializeFiniteDecisionPolicy
iterative/direct dispatcher semantics
```

They add no solver logic, automatic solver selection, domain-specific behavior, registry publication, package-version release declaration, or commercial-license change.

## Separate CI action maintenance

GitHub Actions currently warns that the Node runtime used internally by `actions/checkout@v4` and `actions/setup-node@v4` is deprecated on hosted runners. That warning is separate from the explicit Node 20 runtime used to test the repository and separate from Vitest/Vite compatibility. CI action-version maintenance should be evaluated independently.
