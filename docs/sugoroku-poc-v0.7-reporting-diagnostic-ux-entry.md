# Sugoroku PoC v0.7 Reporting Diagnostic UX Entry

## Purpose

This document opens v0.7 with reporting and diagnostic UX work around the existing generated-target gate.

v0.7 starts from the completed v0.6 validation-gated explicit solving boundary. It does not implement generated-target runtime substitution.

## Starting point

v0.6 completed the generated-target gate as:

```text
solveExpectedRewardWithGeneratedTargetGate(model)
  -> expand generated-target graph
  -> validate generated-target readiness
  -> reject missing generated target before model evaluation
  -> reject explicit/generated mismatch before model evaluation
  -> evaluate the model after acceptance
  -> solve through the existing explicit-target solver
```

The v0.7 reporting layer must describe this path without changing it.

## Preserved invariants

The solver target remains:

```text
solver target = transition.to
```

The contribution target remains:

```text
contribution target = transition.to
```

`generatedTo` remains available for validation, diagnostics, and summary reporting only.

The representative Sugoroku expected reward baseline remains:

```text
start: 2.25
position 1: 1.5
position 2: 1
position 3: 0
```

## v0.7 entry scope

The first v0.7 work is limited to reporting and diagnostic UX around the generated-target gate.

Accepted initial targets:

1. stable public documentation for `solveExpectedRewardWithGeneratedTargetGate()`,
2. stable documentation for `summarizeGeneratedTargetSolverGateResult()`,
3. diagnostic output formatting for accepted gate summaries,
4. diagnostic output formatting for rejected gate summaries,
5. explicit/generated comparison report shapes,
6. example-level usage documentation for gate diagnostics.

## Diagnostic UX goals

The diagnostic output should make these distinctions visible:

- accepted versus rejected gate result,
- total expanded edge count,
- generated-target-ready edge count,
- missing generated target rejection,
- explicit/generated mismatch rejection,
- rejection code as the stable machine-facing field,
- rejection message as the human-facing explanation.

Diagnostic output may mention both explicit and generated targets in reports, but it must not make generated targets executable solver targets.

## Out of scope

The following remain out of scope for this entry phase:

- generated-target runtime substitution,
- `generated_candidate_as_solver_target` as a runtime policy,
- using `generatedTo` as the solver target,
- using `generatedTo` as the contribution output target,
- changing `solveExpectedReward()` internals,
- changing `toContributionResult()` internals,
- accepting missing generated targets,
- accepting explicit/generated mismatches,
- changing the representative expected reward baseline.

## Safe first PR sequence

The recommended v0.7 sequence is:

1. add this v0.7 entry document,
2. add or refine public documentation for the gate wrapper and summary helper,
3. add a formatter for accepted and rejected gate summaries,
4. add formatter regression tests,
5. add explicit/generated comparison report documentation or types only after the formatter boundary is stable.

Each PR should preserve the v0.6 solver and contribution invariants.

## Completion boundary for this entry

This entry is complete when the repository records that v0.7 begins with reporting and diagnostic UX, and when the next implementation PR can add formatting without revisiting solver target policy.
