# Current-generation distribution 1.1.0

This document records the repository-side preparation boundary for `universal-calc-engine@1.1.0` under `ORF-CURRENT-GENERATION-DISTRIBUTION-RELEASE-v1`.

## Distribution identity

- package: `universal-calc-engine`
- version: `1.1.0`
- analytical subject: `subject-public-8b341032516a`
- analytical commit: `8b341032516a2f5108170743c4dafd8fde31a229`
- module contract: ESM only
- Node: `>=22.14.0 <23 || >=24.0.0 <25`
- target immutable tag: `package-v1.1.0`

The historical `universal-calc-engine@1.0.0` and `package-v1.0.0` remain immutable historical distribution identities.

## Fresh first gate

Main Control resumed Stage A only after fresh npm registry evidence established that the package exists, `1.0.0` remains the sole published version, `latest` resolves to `1.0.0`, historical integrity/repository identity reconcile, and prospective `1.1.0` is absent. Distribution Qualification independently repeats registry identity checks before merge, and the tag-triggered publish workflow repeats the prepublication identity gate immediately before publication.

## Package boundary

The npm artifact contains only the package `dist` tree, root `README.md`, root `COMMERCIAL-LICENSE.md`, and npm-generated `package.json` metadata. Repository Showcase fixtures/docs/tests remain outside the npm tarball.

The historical committed `docs/package-api-v1.json` remains the package 1.0.0 compatibility snapshot. Current-generation qualification regenerates the 1.1.0 package API manifest and root runtime/declaration export manifests into `qualification-output/` for each supported Node qualification run.

## Analytical boundary

This release preparation distributes the already-qualified Public API generation without changing analytical semantics. Production analytical source under `packages/core/src/**`, new Public analytical APIs, solver/inference/optimizer semantics, and Showcase runtime semantics are outside this release diff.

## Prepublication gate

Before publication, Distribution Qualification verifies the exact 1.1.0 candidate on Node 22.14.0 and Node 24.18.1, including:

- package/repository identity and historical 1.0.0 integrity preservation
- prospective 1.1.0 registry absence
- production-only npm audit
- typecheck and repository tests
- exact `npm pack` contents and reproducibility
- tarball SHA-256
- normalized packed-file manifest
- root runtime/declaration export manifests
- clean exact-tarball consumer installation
- package-name root ESM import
- TypeScript declaration consumer compile
- Showcase-required current API availability
- exclusion of Showcase repository fixtures/docs from the tarball

## Security preflight

Historical authoritative evidence records npm Trusted Publisher as GitHub provider / `kyoya19/universal-calc-engine` / `publish-package.yml` / publish permission, traditional-token publishing lockdown, and completed bootstrap credential revocation. Stage A does not mutate npm-side Trusted Publisher administration. The current workflow retains `contents: read` and `id-token: write`, supplies no traditional npm token, and publishes only with provenance.

## Publication route and immutable sequencing

Publication remains conditional on the exact merged distribution subject passing the complete prepublication gate. The sequence is:

1. normally merge the distribution-only Public PR with the exact head pinned;
2. verify CI and Distribution Qualification on the exact actual merge commit;
3. bind remaining mandatory prepublication evidence to that exact merge commit;
4. fix `CURRENT_GENERATION_EXACT_DISTRIBUTION_SUBJECT`;
5. verify `package-v1.1.0` and npm `1.1.0` remain absent;
6. create `package-v1.1.0` exactly once at the fixed distribution subject;
7. allow the tag-triggered Trusted Publisher OIDC + provenance workflow to publish the exact qualified tarball;
8. complete postpublication verification before any C-SHOW-003 closure.

Postpublication verification runs on Node 22.14.0 and Node 24.18.1 and compares registry-installed files and registry tarball SHA-256 with exact prepublication evidence. It also verifies current Showcase-required APIs, TypeScript declarations, provenance/attestation metadata, `latest -> 1.1.0`, and unchanged historical 1.0.0 identity.

Tag movement, tag deletion/recreation, republish, unpublish, traditional-token fallback, and GitHub Release object creation are outside this release boundary.
