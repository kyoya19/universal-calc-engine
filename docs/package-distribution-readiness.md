# Package distribution readiness

## Purpose

The analytical core already has a functional-contract v1 boundary. This document defines the separate package/build boundary used to hand the repository to a third party that needs a consumable JavaScript library artifact.

This increment does **not** publish the package to an npm registry and does not declare a semantic-version `1.0.0` release.

## Package status

The root package remains:

```text
name: universal-calc-engine
version: 0.0.1
private: true
type: module
```

`private: true` intentionally remains in place. Registry publication is outside this boundary.

The existing commercial-use terms remain in `COMMERCIAL-LICENSE.md`. The packed artifact includes that file and the root `README.md`; no license text is rewritten by the build.

## Production entrypoint

The source public surface remains:

```text
packages/core/src/index.ts
```

The production build emits:

```text
dist/index.js
dist/index.d.ts
```

and the root package metadata points `main`, `module`, `types`, and the root `exports` entry at those files.

The package is ESM-only at this boundary. No CommonJS build is claimed.

## Build configuration

Production build configuration is isolated in:

```text
tsconfig.build.json
```

It includes only:

```text
packages/core/src/**/*.ts
```

so source tests, examples, and Vitest configuration are not emitted into `dist/`.

The existing development `tsconfig.json`, `npm run typecheck`, and source-based Vitest tests remain unchanged.

## Node ESM module-specifier boundary

The source tree uses TypeScript/Bundler-style relative specifiers such as:

```text
./model
```

A plain TypeScript ESM emit would preserve those extensionless specifiers, while Node ESM consumers require executable relative specifiers such as:

```text
./model.js
```

The build therefore performs two explicit steps:

```text
TypeScript production emit
→ rewrite relative emitted JS/declaration specifiers to .js
```

Only generated files in `dist/` are rewritten. Source imports are not mass-edited.

The same `.js` specifier boundary is applied to generated declaration files so a NodeNext TypeScript consumer can resolve the declarations consistently with the runtime ESM graph.

## Commands

Development checks remain:

```text
npm run typecheck
npm test
```

Production artifact build:

```text
npm run build
```

Packed consumer verification, after a successful build:

```text
npm run package:check
```

CI runs all four boundaries in order:

```text
typecheck
→ test
→ build
→ package smoke test
```

## Package smoke test

`npm run package:check` performs an actual package boundary check rather than importing source files directly.

It:

1. verifies `dist/index.js` and `dist/index.d.ts`,
2. runs `npm pack --json`,
3. checks the tarball file list,
4. rejects source/tests/examples/scripts/build configuration leaking into the packed package,
5. installs the generated tarball into a temporary consumer project with install scripts disabled,
6. imports the installed package with Node ESM,
7. verifies representative forward, direct, dispatcher, reverse, and handoff runtime exports,
8. compiles a separate TypeScript consumer with `moduleResolution: NodeNext`, and
9. removes the temporary consumer and tarball.

Representative public runtime exports checked include:

```text
evaluateDefinitionModel
evaluateAcyclicDirectDefinitionModel
evaluateDefinitionModelWithSolver
estimateExternalReverseInput
toForwardResultHandoff
toReverseResultHandoff
```

This is intentionally a representative public-surface smoke test, not one micro-test per export.

## Packed files

The package `files` boundary is limited to:

```text
dist
README.md
COMMERCIAL-LICENSE.md
```

`package.json` is included by npm packaging semantics.

Tests, examples, `.github`, scripts, TypeScript configs, and Vitest config are not intended package payload.

## Dependency-lock boundary

The repository did not have a committed npm lockfile when this package boundary was introduced, and this increment does not fabricate one.

Accordingly, this boundary guarantees a repeatable **build and package procedure for an installed dependency set**, but it does not claim bit-for-bit dependency resolution reproducibility across arbitrary future `npm install` runs.

A committed dependency lockfile can be evaluated separately as supply-chain/distribution hardening without changing analytical semantics.

## Existing contracts unchanged

This distribution work does not change:

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

It adds no solver logic, automatic solver selection, domain-specific behavior, registry publication, or package-version release declaration.
