# Current-generation 1.1.0 security preflight

Prepublication security boundary for `ORF-CURRENT-GENERATION-DISTRIBUTION-RELEASE-v1`:

- Trusted Publisher historical authoritative configuration: GitHub provider, repository `kyoya19/universal-calc-engine`, workflow `publish-package.yml`, publish permission.
- Current workflow path: `.github/workflows/publish-package.yml`.
- Current workflow permission model retains `contents: read` and `id-token: write`.
- Publication command uses the exact qualified 1.1.0 tarball and `--provenance`.
- Traditional npm token fallback is not used or authorized.
- Historical bootstrap credential recreation is not used or authorized.
- Historical authoritative evidence records traditional-token publishing lockdown and completed bootstrap credential revocation.
- npm-side Trusted Publisher administrative configuration is not mutated by Stage A.

The exact tag-triggered publication route remains conditional on all prepublication gates passing on the exact merged distribution subject.
