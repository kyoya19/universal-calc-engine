# Current-generation 1.1.0 package boundary

The 1.1.0 package keeps the existing ESM-only root contract and Node engine boundary. `package.json` publishes only `dist`, `README.md`, and `COMMERCIAL-LICENSE.md`; repository tests, examples, Showcase fixtures, workflow files, scripts, and package-lock metadata are not included in the npm tarball.

The historical `docs/package-api-v1.json` remains the package 1.0.0 compatibility snapshot. Current 1.1.0 API, runtime-export, declaration-export, packed-file, and tarball-hash manifests are regenerated as exact qualification artifacts.
