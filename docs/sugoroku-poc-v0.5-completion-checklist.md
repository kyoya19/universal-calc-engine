# Sugoroku PoC v0.5 Completion Checklist

## Purpose

This document defines the completion checklist for the v0.5 generated-target solver integration policy entry.

v0.5 is not generated-target solver execution. v0.5 completes the policy and regression-test boundary that keeps generated targets diagnostic-only unless a later PR explicitly changes solver semantics.

## Completed v0.5 scope

The completed v0.5 scope is:

1. Generated-target solver integration policy is documented.
2. `diagnostics_only` is accepted as a graph target policy.
3. `diagnostics_only` remains target-equivalent to `explicit_only`.
4. `generated_candidate_as_solver_target` remains documentation-only and is not accepted at runtime.
5. Solver and contribution behavior are covered by an invariance regression test.
6. Explicit/generated mismatch remains diagnostic information only.

## Current accepted policies

The accepted runtime graph target policies are:

- `explicit_only`,
- `diagnostics_only`.

Both select:

```text
edge.explicitTo
```

Neither selects:

```text
edge.generatedTo
```

## Solver invariant

The current solver invariant remains:

```text
solver target = transition.to
```

That invariant is independent from graph target diagnostics.

A generated graph edge may contain both:

```text
explicitTo
```

and:

```text
generatedTo
```

but solver and contribution calculations still resolve downstream states from the explicit transition target.

## Mismatch invariant

When explicit and generated graph targets differ:

```text
edge.explicitTo !== edge.generatedTo
```

current behavior is:

- graph diagnostics may report the mismatch,
- graph summaries may count the mismatch,
- `selectGraphTarget(edge, 'explicit_only')` returns `edge.explicitTo`,
- `selectGraphTarget(edge, 'diagnostics_only')` returns `edge.explicitTo`,
- `solveExpectedReward()` still uses `transition.to`,
- `toContributionResult()` still reports the explicit target,
- no fallback, reject, or solver-facing error behavior is introduced,
- no model definition is rewritten.

## Regression coverage

v0.5 completion is supported by regression coverage for:

1. `diagnostics_only` target selection equivalence with `explicit_only`,
2. solver and contribution invariance when generated graph targets mismatch explicit targets,
3. the representative Sugoroku v0.3 baseline values remaining unchanged.

The representative expected reward baseline remains:

- start: `2.25`,
- position 1: `1.5`,
- position 2: `1`,
- position 3: `0`.

## Completion checklist

Sugoroku PoC v0.5 policy-entry completion is satisfied when all of the following remain true:

1. `docs/generated-target-solver-integration-policy.md` exists.
2. `docs/v0-5-diagnostics-only-policy-status.md` exists.
3. `GraphTargetPolicy` accepts `explicit_only` and `diagnostics_only`.
4. `GraphTargetPolicy` does not accept `generated_candidate_as_solver_target`.
5. `selectGraphTarget()` returns `edge.explicitTo` for both accepted policies.
6. Solver execution still uses `transition.to`.
7. Contribution output still reports explicit transition targets.
8. Explicit/generated mismatches remain diagnostics-only.
9. Representative Sugoroku expected reward values remain unchanged.
10. Typecheck and tests pass.

## Outside v0.5 completion

The following remain outside v0.5 completion:

- connecting `generatedTo` to `solveExpectedReward()`,
- connecting `generatedTo` to `toContributionResult()`,
- accepting `generated_candidate_as_solver_target` as a runtime policy,
- changing representative Sugoroku expected reward values,
- implementing fallback, reject, or generated-target solver error behavior,
- inferring rewards, probabilities, or terminal conditions from generated states,
- implementing Seikatan reverse estimation.

## Next safe phase

The next safe phase is v0.6 planning.

The first v0.6 PR should define the generated-target solver decision matrix before adding runtime behavior. It should decide whether missing or mismatched generated targets are rejected, treated as fallback-to-explicit, or reported as solver-facing errors.

No v0.6 PR should connect generated targets to the solver until that decision matrix and regression coverage are in place.
