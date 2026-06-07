# Sugoroku PoC v0.4 Boundary

## Purpose

Sugoroku PoC v0.4 starts after the v0.3 completion checklist has been fixed by regression tests.

The v0.4 boundary is not generated-target solver execution. The next safe boundary is to make the representative Sugoroku model reusable and to improve graph diagnostics output while preserving explicit-only solver behavior.

## v0.3 baseline

v0.3 is treated as complete when the following remain true:

- the representative Sugoroku expected reward is fixed at `2.25` from the start state,
- `OutputResult` and `ContributionResult` are available,
- TeX output is available for output, contribution, and `V(state)` forms,
- `effects[]` can derive generated successor candidates,
- graph summary diagnostics can report explicit/generated target match information,
- solver execution remains explicit-only and uses `transition.to`,
- typecheck and tests pass.

## v0.4 scope

v0.4 should focus on stabilizing the inputs and diagnostics around the completed v0.3 pipeline.

Recommended v0.4 work items:

1. Move the representative Sugoroku model into a reusable fixture.
2. Reuse the fixture from solver, contribution, TeX, and graph diagnostics tests.
3. Add graph summary serialization helpers when needed for inspection output.
4. Add explicit/generated mismatch examples that remain diagnostics-only.
5. Keep README and docs aligned with the new fixture and diagnostics path.

## Non-goals

The following remain outside v0.4 unless a later PR explicitly narrows the scope:

- using `generatedTo` as the solver target,
- replacing explicit `transition.to` with generated candidates,
- auto-rewriting mismatched explicit targets,
- inferring rewards, probabilities, or terminal conditions from generated states,
- formula effects,
- reverse estimation,
- Seikatan behavior,
- product UI or monetization work.

## Solver boundary

The solver-facing rule remains:

```text
solver target = transition.to
```

Generated targets may be produced, summarized, serialized, and tested as diagnostics, but they must not override explicit targets in solver or contribution calculations.

Any generated-target solver integration must be introduced in a later dedicated PR and must include:

1. an explicit policy name other than `explicit_only`,
2. unchanged regression coverage for explicit-only behavior,
3. representative model expected values before and after the policy change,
4. documented handling of explicit/generated mismatches,
5. typecheck and test success.

## Suggested PR sequence

1. Add this v0.4 boundary document.
2. Extract the representative Sugoroku model into a fixture.
3. Refactor v0.3 completion tests to use the fixture without changing expected values.
4. Add graph diagnostics serialization or reporting helpers.
5. Add mismatch fixture/tests that prove diagnostics do not mutate solver targets.

## Completion criteria for v0.4

Sugoroku PoC v0.4 is complete when:

1. the representative Sugoroku fixture is shared across the relevant tests,
2. the v0.3 expected reward baseline remains unchanged,
3. graph diagnostics are inspectable without changing solver behavior,
4. explicit/generated mismatch handling is tested as diagnostics-only,
5. docs clearly state that generated-target solver integration is still outside the current boundary,
6. typecheck and tests pass.
