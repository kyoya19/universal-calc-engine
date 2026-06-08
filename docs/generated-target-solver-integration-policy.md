# Generated Target Solver Integration Policy

## Purpose

This document defines the v0.5 entry policy for any future generated-target solver integration.

v0.5 starts from policy definition only. It does not connect `generatedTo` to the solver, does not change expected reward values, and does not change contribution target semantics.

## Current authoritative behavior

The current solver-facing target remains:

```text
solver target = transition.to
```

That rule is named `explicit_only`.

Under `explicit_only`:

- `transition.to` is the authoritative target for solver execution,
- contribution output reports the explicit transition target,
- `generatedTo` may be computed by graph expansion,
- `generatedTo` may be serialized in graph summaries,
- `generatedTo` may be used for diagnostics,
- `generatedTo` must not override `transition.to`.

## Policy names

The following policy names define the boundary for future work.

### `explicit_only`

`explicit_only` is the current and default behavior.

It selects `transition.to` / `explicitTo` as the only solver target. Explicit/generated mismatch is reported as diagnostic information and does not affect solver execution.

### `diagnostics_only`

`diagnostics_only` is a documentation-level policy name for keeping generated targets outside solver execution while requiring graph diagnostics to be available.

It is equivalent to `explicit_only` for solver target selection, but it requires generated graph summary output to remain inspectable.

A future implementation may add this as a type-level alias or mode only if it does not change solver or contribution output.

### `generated_candidate_as_solver_target`

`generated_candidate_as_solver_target` is a future candidate policy name.

It is not approved for implementation by this document.

Before this policy can be implemented, a later PR must define all of the following:

1. how an edge without `generatedTo` is handled,
2. how explicit/generated mismatch is handled,
3. whether mismatches are rejected, downgraded to explicit targets, or treated as hard errors,
4. whether representative model expected values remain unchanged,
5. what regression tests prove that `explicit_only` behavior is unchanged.

## Explicit/generated mismatch behavior

For v0.5 policy entry, mismatch behavior remains diagnostics-only.

When `explicitTo !== generatedTo`:

- `explicit_only` uses `explicitTo`,
- `diagnostics_only` uses `explicitTo`,
- graph summary may count and serialize the mismatch,
- solver execution must not auto-correct the explicit target,
- contribution output must not switch to the generated target,
- the model definition is not rewritten.

A future generated-target policy must choose one explicit mismatch strategy before solver integration.

Allowed future strategies are:

1. `reject`: fail before solving when any required generated target is missing or mismatched,
2. `fallback`: use generated targets only when they exactly match explicit targets or when explicit fallback rules are documented,
3. `error`: throw a solver-facing error when generated and explicit targets disagree.

The current approved strategy is diagnostics-only reporting under `explicit_only`.

## Fallback, error, and reject rules

No fallback, error, or reject behavior is introduced in v0.5 policy entry.

The current behavior is:

- missing `generatedTo`: allowed for diagnostics,
- mismatched `generatedTo`: allowed for diagnostics,
- solver target: still `transition.to`,
- expected reward: unchanged,
- contribution target: unchanged.

A later PR that introduces fallback, error, or reject behavior must include tests for all three cases:

1. explicit and generated targets match,
2. generated target is missing,
3. explicit and generated targets mismatch.

## Representative model expected values

The representative Sugoroku model expected reward baseline must remain unchanged while the policy is documentation-only.

The fixed baseline is:

- start: `2.25`,
- position 1: `1.5`,
- position 2: `1`,
- position 3: `0`.

A future generated-target solver policy may only change expected values in a dedicated PR that documents the before/after values and explains why the generated-target policy is intentionally changing solver semantics.

## v0.5 entry acceptance criteria

The v0.5 generated-target solver integration entry is complete when:

1. this policy document exists,
2. `explicit_only` remains the current solver behavior,
3. `diagnostics_only` is defined as a non-solver-changing policy boundary,
4. `generated_candidate_as_solver_target` is documented only as a future candidate,
5. explicit/generated mismatch behavior remains diagnostics-only,
6. representative model expected values remain unchanged,
7. typecheck and tests pass.

## Safe PR sequence after this document

After this policy document is merged, the safe sequence is:

1. add policy type definitions only, without changing solver behavior,
2. add tests proving `explicit_only` remains unchanged under the policy type boundary,
3. optionally add `diagnostics_only` as a solver-equivalent inspection mode,
4. only then design a separate generated-target solver PR,
5. keep generated-target solver execution out of the policy/type PRs.

## Non-goals

The following are outside this document:

- connecting `generatedTo` to `solveExpectedReward()`,
- changing `toContributionResult()` target behavior,
- changing representative Sugoroku expected values,
- rewriting model definitions from generated candidates,
- inferring rewards, probabilities, or terminal conditions from generated states,
- implementing Seikatan reverse estimation.
