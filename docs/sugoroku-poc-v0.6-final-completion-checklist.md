# Sugoroku PoC v0.6 Final Completion Checklist

## Purpose

This document records the final v0.6 completion boundary for generated-target solver integration.

v0.6 completes validation-gated explicit solving. It does not implement generated-target runtime substitution.

## Final v0.6 status

The completed v0.6 runtime path is:

```text
solveExpectedRewardWithGeneratedTargetGate(model)
  -> expand generated-target graph
  -> validate generated-target readiness
  -> reject missing generated target before model evaluation
  -> reject explicit/generated mismatch before model evaluation
  -> evaluate the model after acceptance
  -> solve through the existing explicit-target solver
```

## Completed implementation

- Generated-target solver planning type names exist.
- `require_generated_match` is the selected planning candidate.
- Missing generated targets are rejected.
- Explicit/generated mismatches are rejected.
- `solveExpectedRewardWithGeneratedTargetGate()` exists.
- Gate result summaries exist.
- Gate failure codes exist.
- Accepted and rejected gate examples are documented.

## Completed regression coverage

Regression tests cover:

1. accepted generated-target validation runs the existing explicit-target solver,
2. missing generated target rejection,
3. missing generated target rejection before model evaluation,
4. explicit/generated mismatch rejection,
5. explicit/generated mismatch rejection before model evaluation,
6. representative expected reward baseline invariance,
7. explicit-target contribution output invariance,
8. accepted gate summary output,
9. rejected gate summary output,
10. gate failure code output.

## Preserved invariants

The solver target invariant remains:

```text
solver target = transition.to
```

The contribution target invariant remains:

```text
contribution target = transition.to
```

The representative Sugoroku expected reward baseline remains:

```text
start: 2.25
position 1: 1.5
position 2: 1
position 3: 0
```

## Explicitly not implemented

The following remain unimplemented and rejected for v0.6:

- `generated_candidate_as_solver_target` as a runtime policy,
- `generatedTo` as a solver target,
- `generatedTo` as a contribution output target,
- changing `solveExpectedReward()` internals,
- changing `toContributionResult()` internals,
- falling back from missing generated targets to explicit targets,
- accepting explicit/generated mismatches,
- implicit expected reward semantic changes.

## Final v0.6 decision

v0.6 closes with validation-gated explicit solving.

The generated target is used to prove readiness and detect mismatch, not to replace the explicit target.

## Next safe phase

The next safe phase is v0.7.

v0.7 should not begin with runtime target substitution.

The recommended v0.7 entry is reporting and UX around the existing gate:

- stable public docs for the gated wrapper API,
- richer diagnostic output formatting,
- CLI or example-level usage documentation,
- separate explicit/generated comparison reports,
- continued preservation of explicit solver semantics.

## Handoff summary

The handoff sentence for the next phase is:

```text
v0.6 completed generated-target validation-gated explicit solving; v0.7 begins with reporting and diagnostic UX, not generated-target runtime substitution.
```
