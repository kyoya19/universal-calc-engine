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

## Package boundary

The npm artifact contains only the package `dist` tree, root `README.md`, root `COMMERCIAL-LICENSE.md`, and npm-generated `package.json` metadata. Repository Showcase fixtures/docs/tests remain outside the npm tarball.

The current-generation qualification regenerates the package API manifest and the root runtime/declaration export manifests into `qualification-output/` for each supported Node qualification run.

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

## Publication route

Publication is tag-triggered only after the exact merged distribution subject has passed the complete prepublication gate. `.github/workflows/publish-package.yml` retains `contents: read` and `id-token: write`, uses npm Trusted Publishing, supplies no traditional npm token, and publishes the exact qualified tarball with `--provenance`.

Postpublication verification runs on Node 22.14.0 and Node 24.18.1 and compares the registry-installed files and registry tarball SHA-256 with the exact prepublication evidence. It also verifies current Showcase-required APIs, TypeScript declarations, provenance/attestation metadata, `latest -> 1.1.0`, and unchanged historical 1.0.0 identity.

Tag movement, tag deletion/recreation, republish, unpublish, traditional-token fallback, and GitHub Release object creation are outside this release boundary.
