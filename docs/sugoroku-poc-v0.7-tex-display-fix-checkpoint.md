# Sugoroku PoC v0.7 TeX Display Fix Checkpoint

## Purpose

This document records the v0.7 display-only TeX checkpoint after fixing duplicate start-state output in `outputResultToValueFunctionTex()`.

The checkpoint is display-only. It does not change solver behavior, contribution behavior, generated-target validation, runtime target policy, or expected reward calculation.

## Checked main boundary

The checked main boundary is after:

```text
PR #78 Avoid duplicate start state in value-function TeX
merge commit: 030fd954632f4258b668a50f7e8aafe453c25ee7
CI run: #151 success
```

## Fixed display behavior

Before the fix, `outputResultToValueFunctionTex()` printed the start state first and then printed all `expectedRewardByState` rows. When the start state was also included in `expectedRewardByState`, the same value-function row appeared twice.

After the fix:

- the start state is still printed first,
- remaining value-function rows are sorted,
- the start state is excluded from the remaining rows,
- the expected reward values are unchanged.

## Regression coverage

The regression test confirms that the start-state value-function label appears once in the value-function TeX output.

The representative Sugoroku values remain:

```text
V(position=3) = 0
V(position=2) = 1
V(position=1) = 1.5
V(position=0) = 2.25
```

## Preserved invariants

The solver target remains:

```text
solver target = transition.to
```

The contribution target remains:

```text
contribution target = transition.to
```

`generatedTo` remains available for:

- validation,
- diagnostics,
- summaries,
- explicit/generated comparison reports.

`generatedTo` is not used as:

- solver target,
- contribution target,
- runtime substitution target.

## Confirmed out of scope

This checkpoint does not approve or implement:

- generated-target runtime substitution,
- `generated_candidate_as_solver_target` as an accepted runtime policy,
- solving against `generatedTo`,
- contribution output against `generatedTo`,
- fallback from missing generated targets to explicit targets,
- acceptance of explicit/generated mismatches,
- expected reward baseline changes.

## Android-oriented display note

Long raw TeX source is hard to read on narrow Android screens. Follow-up UX work should prefer decomposed rows or table-style display for human review, while keeping TeX source available as an export or diagnostic artifact.
