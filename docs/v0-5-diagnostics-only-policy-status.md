# v0.5 Diagnostics-Only Policy Status

## Purpose

This document records the v0.5 status after adding the `diagnostics_only` graph target policy type.

The change is intentionally narrow. It makes `diagnostics_only` selectable at the graph target helper boundary while preserving explicit target behavior.

## Current accepted graph target policies

The currently accepted graph target policies are:

- `explicit_only`,
- `diagnostics_only`.

Both policies select the explicit target:

```text
selected graph target = edge.explicitTo
```

`diagnostics_only` does not select `edge.generatedTo`.

## Current non-accepted generated-target policy

`generated_candidate_as_solver_target` remains documentation-only.

It is not an accepted `GraphTargetPolicy` value and must not be passed to `selectGraphTarget()` in runtime code.

A later PR must explicitly introduce and test any generated-target solver policy before it can become accepted.

## Diagnostics-only behavior

Under `diagnostics_only`:

- explicit/generated matches may be inspected through graph summaries,
- explicit/generated mismatches may be inspected through diagnostics,
- `edge.generatedTo` remains visible for inspection,
- `edge.generatedTo` does not override `edge.explicitTo`,
- solver and contribution behavior remain unchanged.

## Mismatch behavior

When `edge.explicitTo !== edge.generatedTo`:

- `explicit_only` returns `edge.explicitTo`,
- `diagnostics_only` returns `edge.explicitTo`,
- the mismatch is diagnostic information,
- no model definition is rewritten,
- no fallback, reject, or solver-facing error behavior is introduced.

## Completion status

The v0.5 diagnostics-only policy type boundary is complete when:

1. `GraphTargetPolicy` accepts `diagnostics_only`,
2. `selectGraphTarget()` returns `edge.explicitTo` for `diagnostics_only`,
3. a regression test proves `diagnostics_only` remains equivalent to `explicit_only` for mismatched edges,
4. `generated_candidate_as_solver_target` remains outside accepted runtime policies,
5. typecheck and tests pass.

## Next safe step

The next safe step is a small PR that documents or tests solver-side invariance from the policy boundary.

That step must not connect `generatedTo` to `solveExpectedReward()` or `toContributionResult()`.
