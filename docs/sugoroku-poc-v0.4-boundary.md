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

v0.4 focuses on stabilizing the inputs and diagnostics around the completed v0.3 pipeline.

Implemented v0.4 work items:

1. The representative Sugoroku model is available as a reusable test fixture.
2. The v0.3 completion regression test uses the shared fixture without changing expected values.
3. Graph summary diagnostics have versioned serialization and JSON output helpers.
4. An explicit/generated mismatch fixture proves mismatch handling remains diagnostics-only.
5. README and docs keep generated-target solver integration outside the current boundary.

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

The compact policy note for this rule is maintained in `docs/solver-exp.md`.

Public entrypoint policy JSON stability is fixed in `packages/core/test/generated_target_solver_policy.test.ts`.

Runtime target policy changes must start from a dedicated policy PR before solver behavior changes.

Any generated-target solver integration must be introduced in a later dedicated PR and must include:

1. an explicit policy name other than `explicit_only`,
2. unchanged regression coverage for explicit-only behavior,
3. representative model expected values before and after the policy change,
4. documented handling of explicit/generated mismatches,
5. typecheck and test success.

## Completed PR sequence

1. Added this v0.4 boundary document.
2. Extracted the representative Sugoroku model into a fixture.
3. Refactored the v0.3 completion test to use the fixture without changing expected values.
4. Added graph diagnostics serialization and JSON reporting helpers.
5. Added mismatch fixture/tests that prove diagnostics do not mutate solver targets.

## Completion checklist for v0.4

Sugoroku PoC v0.4 is complete when all of the following remain true:

1. The representative Sugoroku fixture is shared across the relevant tests.
2. The v0.3 expected reward baseline remains unchanged.
3. Graph diagnostics are inspectable through versioned summary serialization and JSON output.
4. Explicit/generated mismatch handling is tested as diagnostics-only.
5. Solver and contribution calculations still use explicit `transition.to` targets.
6. Public entrypoint rejection coverage and policy JSON stability keep generated-target planning outside solver execution.
7. Generated-target solver integration and runtime target policy changes are still outside the current boundary.
8. Typecheck and tests pass.

## Current completion status

The v0.4 completion checklist is satisfied by the current test suite when:

```bash
npm run typecheck
npm test
```

both pass.

This completion status does not approve generated-target solver integration or runtime target policy changes. The next phase must start from a new boundary document or a dedicated policy PR.
