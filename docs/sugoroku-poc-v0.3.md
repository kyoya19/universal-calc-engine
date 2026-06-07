# Sugoroku PoC v0.3

## Purpose

Sugoroku PoC v0.3 verifies the minimal calculation pipeline for the universal probability state transition engine.

The current completion boundary is explicit-only solver execution with state generation and graph diagnostics available beside the solver.

## Current pipeline

```text
DefinitionModel
  -> ExpandedModel
  -> EvaluatedModel
  -> SolvedModel
  -> OutputResult
  -> ContributionResult
```

The state generation and graph inspection path is separate from solver execution:

```text
DefinitionModel
  -> seedStatesFromModel()
  -> expandGraphFromModel()
  -> summarizeStateGraph()
```

## Confirmed behavior

- The solver still resolves downstream states from explicit `transition.to`.
- `effects[]` can generate candidate successor states for diagnostics.
- `generatedTo` is not used as a solver target.
- Explicit/generated mismatches are diagnostic information.
- Mismatches are not automatically corrected.
- Regression tests cover explicit-only solver behavior when `effects[]` is present.

## Completion criteria

Sugoroku PoC v0.3 is complete when all of the following remain true:

1. Expected reward calculation still works for the representative Sugoroku model.
2. Output and contribution results are available.
3. TeX output remains available for output, contribution, and `V(state)` forms.
4. State generation helpers can derive deterministic candidate states from `effects[]`.
5. Graph expansion can report explicit/generated target diagnostics.
6. Solver execution remains explicit-only.
7. Typecheck and tests pass.

## Non-goals

The following are intentionally outside v0.3:

- using `generatedTo` as the solver target,
- auto-rewriting explicit targets from generated candidates,
- formula effects,
- reverse estimation,
- Seikatan behavior,
- monetization or product UI work.

## Verification commands

```bash
npm run typecheck
npm test
```
