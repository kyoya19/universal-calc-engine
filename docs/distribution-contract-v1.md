# External distribution contract v1

This document describes the public package contract implemented under `ORF-DISTRIBUTION-CONTRACT-v1`.

It does not expand the analytical scope of the engine. The analytical reference remains:

```text
subject-public-1df6235d58a5
1df6235d58a5027fdae0390f7a73a09cfb4ee1ee
```

The package/distribution subject is a separate exact Public commit that packages the already-qualified analytical contract.

## Package identity

```text
name: universal-calc-engine
registry: https://registry.npmjs.org/
initial stable package version: 1.0.0
visibility: public
module contract: ESM only
root import: supported
deep imports: unsupported
CommonJS require: unsupported
runtime dependencies: zero
```

The historical `functional-contract v1` declaration and npm package version `1.0.0` are separate concepts. Package `1.0.0` means the existing qualified analytical contract has been connected to a stable external distribution contract.

## Install

After publication:

```bash
npm install universal-calc-engine
```

Prepublication qualification installs the exact generated `.tgz` into a fresh consumer directory.

Consumers do not need the repository checkout, TypeScript source, repository scripts, workspace links, or a package build step.

## Import

```ts
import {
  evaluateExternalModelJson,
  estimateExternalReverseJson,
  toForwardResultHandoff,
  toReverseResultHandoff
} from 'universal-calc-engine';
```

Only the root package subpath (`.`) is part of distribution v1.

Examples such as the following are not supported package contracts:

```text
universal-calc-engine/dist/model.js
universal-calc-engine/dist/forward_evaluation.js
universal-calc-engine/package.json
```

The `exports` map is authoritative even when a file physically exists in the packed `dist/` directory.

## Supported Node runtime lines

Distribution v1 qualifies Linux x64 consumers on:

```text
>=22.14.0 <23
>=24.0.0 <25
```

The qualification matrix pins exact patch releases. Node 20 and earlier, 23, 25, 26, browser runtimes, Windows, and macOS are not independently qualified by Gate DIST-v1.

## TypeScript declarations

The package ships:

```text
./dist/index.d.ts
```

The declaration contract is NodeNext-compatible and is consumed through the package name. Qualification uses TypeScript 5.5.x and the exact TypeScript version locked by the repository toolchain.

The package does not require TypeScript as a runtime or peer dependency.

## Public API manifest

The versioned root API snapshot is:

```text
docs/package-api-v1.json
```

It separates:

- `qualifiedEntryPoints`: entry points backed by current analytical qualification;
- `rootCompatibilityExports`: every root runtime/declaration export shipped in package 1.0.0 for compatibility tracking.

An identifier appearing in `rootCompatibilityExports` does not imply stronger analytical qualification than documented elsewhere.

## Packed artifact boundary

The npm artifact may contain only:

```text
package.json
README.md
COMMERCIAL-LICENSE.md
dist/**/*.js
dist/**/*.d.ts
```

It must not contain repository source, tests, examples, scripts, GitHub workflow files, package-lock.json, tsconfig files, source maps, declaration maps, credentials, `.npmrc`, private research material, or local environment files.

Consumer installation must not depend on `preinstall`, `install`, or `postinstall` scripts.

## License and commercial use

Public npm availability does not grant commercial-use permission.

The packed artifact includes `COMMERCIAL-LICENSE.md`, and `package.json` retains:

```text
SEE LICENSE IN COMMERCIAL-LICENSE.md
```

Commercial use remains subject to the terms in that file.

## Distribution qualification

Gate DIST-v1 is separate from all analytical Gates.

Prepublication qualification requires `DIST-001` through `DIST-011`:

| Test | Purpose |
|---|---|
| DIST-001 | package identity and metadata |
| DIST-002 | clean build and packed artifact boundary |
| DIST-003 | clean consumer ESM import |
| DIST-004 | clean consumer TypeScript declaration compile |
| DIST-005 | root export and deep-import boundary |
| DIST-006 | representative already-qualified forward/reverse execution through the installed package |
| DIST-007 | runtime/declaration root surface consistency |
| DIST-008 | normalized artifact reproducibility |
| DIST-009 | analytical/source/distribution provenance linkage |
| DIST-010 | supported Node runtime matrix |
| DIST-011 | license and consumer documentation contract |

Successful reversible state:

```text
PREPUBLICATION_QUALIFIED
```

Actual first npm publication requires a separate explicit release authorization.

After publication, `DIST-012` repeats consumer verification from the npm registry. Final distribution state is:

```text
PUBLISHED_VERIFIED
```

## Representative analytical smoke boundary

Distribution qualification verifies that already-qualified behavior remains reachable through:

```text
packed artifact
→ clean install
→ package-name import
→ checked forward / reverse entry point
→ versioned handoff
```

This does not create a new analytical claim or a new principal test domain.

The smoke check covers a finite checked forward model and a finite-candidate checked reverse model. Analytical semantics remain governed by the existing v1 documentation and exact analytical subject.

## Known analytical limits remain limits

Distribution v1 does not add support for:

```text
continuous inference
Bayesian posterior inference
causal inference
hidden-state inference
arbitrary cyclic decision optimization
arbitrary uncertainty-distribution propagation
```

Known scoped limitations `SEI-404`, `KS-504`, `CMP-604`, and `CMP-606` remain analytical scope boundaries; they are not distribution failures.

## SemVer

Package releases use `MAJOR.MINOR.PATCH`.

- PATCH: fixes that restore the existing published contract without breaking consumers.
- MINOR: backward-compatible additive package capability.
- MAJOR: published consumer-contract breaks such as stable export removal, incompatible signature/schema semantics, ESM contract restructuring, supported Node-line removal, or exports-map incompatibility.

A package identity/name change requires separate distribution authority rather than only a major-version increment.

## Release provenance

The first public release is designed for GitHub-hosted Actions and npm Trusted Publishing/OIDC with least privilege:

```text
contents: read
id-token: write
```

The release tag format is:

```text
package-v1.0.0
```

The tag must point exactly to the qualified distribution subject. The first registry publication uses the `candidate` dist-tag; `latest` is promoted only after post-publication verification.

Published artifacts are immutable provenance evidence. A failed published version is never overwritten or republished in place.

## Source and qualification linkage

Canonical source repository:

```text
https://github.com/kyoya19/universal-calc-engine
```

Each distribution qualification records the package version, exact distribution commit, linked analytical subject/commit, normalized content-manifest SHA-256, API-manifest SHA-256, tarball SHA-256, Node/npm/TypeScript versions, and qualification result ID.

Package-only metadata/release changes do not update the analytical subject. Analytical targeted requalification is required only when runtime/API/schema/solver/statistical semantics change or a build transformation can change qualified analytical behavior.
