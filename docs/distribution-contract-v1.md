# External distribution contract v1

This document describes the public package contract implemented under `ORF-DISTRIBUTION-CONTRACT-v1`.

It does not expand the analytical scope of the engine. Distribution identity and analytical-subject identity remain separate.

## Current-generation status

The current verified consumer distribution is:

```text
package: universal-calc-engine
version: 1.1.0
registry: npm public registry
module contract: ESM only
root import: supported
deep imports: unsupported
CommonJS require: unsupported
runtime dependencies: zero
analytical subject: subject-public-8b341032516a
analytical commit: 8b341032516a2f5108170743c4dafd8fde31a229
package tag: package-v1.1.0
package tag target: 76e7ace7e06ab33753d573b7e6d42abc717c178f
```

The current consumer starting point is [Current-generation consumer quickstart](current-generation-consumer-quickstart.md).

The historical package `1.0.0` and its original distribution qualification remain immutable earlier evidence. References below to the initial stable release describe that historical first-release stage and are not statements that `1.0.0` is still the current package.

## Package identity

```text
name: universal-calc-engine
registry: https://registry.npmjs.org/
current qualified package version: 1.1.0
initial stable package version: 1.0.0
visibility: public
module contract: ESM only
root import: supported
deep imports: unsupported
CommonJS require: unsupported
runtime dependencies: zero
```

The historical `functional-contract v1` declaration and npm package version `1.0.0` are separate concepts. Package `1.0.0` connected the then-qualified analytical contract to the stable external distribution contract. Package `1.1.0` is the current qualified distribution generation and is a compatible additive distribution of already-qualified Public APIs; it does not rewrite the historical `1.0.0` artifact.

## Install

Install the exact current qualified version:

```bash
npm install universal-calc-engine@1.1.0
```

Distribution qualification installs an exact generated `.tgz` into a fresh consumer directory before publication and verifies the published registry artifact after release.

Consumers do not need the repository checkout, TypeScript source, repository scripts, workspace links, or a package build step to use the package API.

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

The committed versioned compatibility snapshot is:

```text
docs/package-api-v1.json
```

That file is the historical package `1.0.0` compatibility snapshot. It is not rewritten to masquerade as a `1.1.0` historical record.

Current `1.1.0` root runtime/declaration/API manifests are regenerated as Distribution Qualification evidence. An exported identifier does not imply stronger analytical qualification than documented by its qualified capability contract.

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

Successful reversible prepublication state:

```text
PREPUBLICATION_QUALIFIED
```

After publication, `DIST-012` repeats consumer verification from the npm registry. A verified published distribution is:

```text
PUBLISHED_VERIFIED
```

The current `universal-calc-engine@1.1.0` distribution has passed the current-generation publication/verification path. Documentation maintenance does not create another release or alter that distribution subject.

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

The smoke check covers representative already-qualified behavior. Analytical semantics remain governed by the existing v1/current-generation documentation and exact analytical subject.

## Known analytical limits remain limits

Distribution v1 does not add support merely by publication for:

```text
continuous inference
Bayesian posterior inference
causal inference
arbitrary policy optimization
arbitrary uncertainty-distribution propagation
```

Additional current qualified finite hidden-state and trajectory capabilities are described by their own current API contracts; publication does not enlarge any claim beyond those contracts.

Known scoped limitations remain analytical scope boundaries rather than distribution failures.

## SemVer

Package releases use `MAJOR.MINOR.PATCH`.

- PATCH: fixes that restore the existing published contract without breaking consumers.
- MINOR: backward-compatible additive package capability.
- MAJOR: published consumer-contract breaks such as stable export removal, incompatible signature/schema semantics, ESM contract restructuring, supported Node-line removal, or exports-map incompatibility.

A package identity/name change requires separate distribution authority rather than only a major-version increment.

## Release provenance

Public releases are designed for GitHub-hosted Actions and npm Trusted Publishing/OIDC with least privilege:

```text
contents: read
id-token: write
```

Historical first public release:

```text
package-v1.0.0
bddff4fcc4f744c8b5e9ac7868a6ca40e7163e47
```

Current-generation release:

```text
package-v1.1.0
76e7ace7e06ab33753d573b7e6d42abc717c178f
```

A release tag must point exactly to its qualified distribution subject. Published artifacts are immutable provenance evidence. A failed published version is never overwritten or republished in place.

## Source and qualification linkage

Canonical source repository:

```text
https://github.com/kyoya19/universal-calc-engine
```

Each distribution qualification records the package version, exact distribution commit, linked analytical subject/commit, normalized content-manifest SHA-256, API-manifest SHA-256, tarball SHA-256, Node/npm/TypeScript versions, and qualification result ID.

Package-only metadata/release/documentation changes do not update the analytical subject. Analytical targeted requalification is required only when runtime/API/schema/solver/statistical semantics change or a build transformation can change qualified analytical behavior.
