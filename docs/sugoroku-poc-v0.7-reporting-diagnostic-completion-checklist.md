# Sugoroku PoC v0.7 Reporting Diagnostic Completion Checklist

## Purpose

This document records the v0.7 reporting / diagnostic UX completion checkpoint after the comparison report formatter, CI workflow observation, and execution check fixes.

This checkpoint is documentation-only. It does not change solver behavior, contribution behavior, generated-target validation, or runtime target policy.

## Checked main boundary

The checked main boundary is after:

```text
PR #76 Record CI workflow observation for v0.7 safety checkpoint
merge commit: 95b7bc049d6957ee4b7daf79662f0af0fabcb3e2
CI run: #147 success
Typecheck: success
Test: success
```

## Completed v0.7 reporting and diagnostic UX work

The v0.7 reporting and diagnostic UX path includes:

- v0.7 reporting / diagnostic UX entry document,
- generated-target gate public API documentation,
- gate result summary formatter,
- gate formatter usage documentation,
- explicit/generated comparison report shape documentation,
- generated-target comparison report builder,
- generated-target comparison report formatter,
- v0.7 reporting diagnostic safety checkpoint document,
- CI workflow observation for the safety checkpoint,
- typecheck failure fix,
- test failure fix,
- successful typecheck / test confirmation through GitHub Actions.

## Completion criteria

The v0.7 reporting / diagnostic UX checkpoint is complete when all of the following remain true:

- the public reporting and diagnostic documents describe the generated-target gate boundary,
- comparison report shape, builder, and formatter are documented or implemented,
- CI is available through `.github/workflows/ci.yml`,
- `npm run typecheck` succeeds,
- `npm test` succeeds,
- expected reward baseline remains unchanged,
- generated-target data remains diagnostic / validation / reporting data only.

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

## Expected reward baseline

The representative Sugoroku baseline remains:

```text
V(position=3) = 0
V(position=2) = 1
V(position=1) = 1.5
V(position=0) = 2.25
```

This checklist does not change the expected reward calculation or its regression expectations.

## Confirmed out of scope

This completion checkpoint does not approve or implement:

- generated-target runtime substitution,
- `generated_candidate_as_solver_target` as an accepted runtime policy,
- solving against `generatedTo`,
- contribution output against `generatedTo`,
- fallback from missing generated targets to explicit targets,
- acceptance of explicit/generated mismatches,
- expected reward baseline changes.

## Follow-up display-only issue

The current value-function TeX output can show the start state twice when the start state is printed first and the full state list also includes the same state.

That is a display specification issue only. A follow-up PR may adjust `outputResultToValueFunctionTex()` to avoid duplicate start-state display while preserving the expected reward baseline.

Android-oriented display should prefer readable tables or decomposed value-function rows rather than long raw TeX source blocks.
