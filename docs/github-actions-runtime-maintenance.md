# GitHub Actions runtime maintenance

## Purpose

This increment updates the JavaScript runtime used internally by the repository's GitHub Actions without changing the Node.js version used to execute the repository's tests or changing analytical/package contracts.

## Action versions

Before this increment, CI used:

```text
actions/checkout@v4
actions/setup-node@v4
```

GitHub's current official action documentation identifies the current major lines as:

```text
actions/checkout@v6
actions/setup-node@v6
```

The v5 generation moved both actions to the Node.js 24 action runtime. The current v6 lines retain that Node.js 24 internal runtime.

The workflow therefore now uses:

```text
actions/checkout@v6
actions/setup-node@v6
```

## Repository Node runtime remains separate

The repository test runtime remains explicitly configured as:

```text
node-version: 20
```

The GitHub-hosted runner used by the preceding compatibility work resolved that request to Node.js 20.20.2. This increment does not change the library's Node support policy or the Node version used by `npm ci`, typecheck, Vitest, build, or package-smoke commands.

## Compatibility review

`actions/checkout@v6` changes persisted credential storage to use `$RUNNER_TEMP` rather than storing credentials directly in local Git configuration. The repository CI does not perform authenticated Git operations from Docker container actions, so the v6 Docker-container runner requirement does not affect this workflow.

`actions/setup-node@v6` removes the deprecated `always-auth` input and changes automatic package-manager caching behavior. This repository does not use `always-auth` and its `package.json` does not declare a top-level `packageManager` or `devEngines.packageManager` field.

To keep cache behavior explicit and unchanged, CI sets:

```text
package-manager-cache: false
```

No dependency cache is therefore introduced by this migration.

## Permissions

This increment does not add or broaden workflow permissions. The workflow remains read-oriented and does not introduce write permissions for pull-request execution.

## Dependency and package boundary

This increment does not modify:

```text
package.json
package-lock.json
Vitest
Vite
TypeScript
@types/node
```

The dependency lock is not regenerated.

The existing CI command sequence remains:

```text
npm ci --no-audit --no-fund
npm run audit:production
npm run typecheck
npm test
npm run build
npm run package:check
```

The full development `npm audit` is not added as a permanent gate in this increment. It remains a separate policy decision because development-only advisories can block unrelated work, while the existing production-only audit is already an explicit release-safety boundary. The full dependency graph was at zero advisories when this maintenance increment began.

## Unchanged analytical contracts

This maintenance does not change:

```text
DefinitionModel
ForwardEvaluationOptions
ForwardEvaluationResult
ForwardResultHandoff schemaVersion: 1
ReverseResultHandoff
Seikatan estimator semantics
FiniteDecisionProcess P0
materializeFiniteDecisionPolicy
iterative/direct dispatcher semantics
analytical formulas
package public API
```

No npm registry publication, package-version release, `private` flag change, or domain-specific production behavior is included.
