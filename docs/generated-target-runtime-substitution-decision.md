# Generated Target Runtime Substitution Decision

## Purpose

This document records the design decision after the v0.6 generated-target gated wrapper completion.

The question is whether generated targets may replace explicit transition targets at solver runtime.

## Decision

Runtime target substitution remains rejected.

```text
generated_candidate_as_solver_target = rejected
```

The current runtime invariant remains:

```text
solver target = transition.to
contribution target = transition.to
```

`generatedTo` may be used for validation, diagnostics, summaries, and future design analysis. It must not replace `transition.to` in the solver or contribution output.

## Rationale

Generated targets are derived candidates. Explicit targets are the authored solver contract.

Replacing explicit targets with generated targets would change expected reward semantics. That change cannot be hidden inside the existing solver path.

The v0.6 gated wrapper already provides the safe boundary:

```text
validate generated-target readiness -> run existing explicit-target solver
```

This preserves solver behavior while proving that generated targets match explicit targets before solving.

## Rejected runtime behavior

The following remain rejected:

- using `generatedTo` as the runtime solver target,
- using `generatedTo` as the contribution output target,
- adding `generated_candidate_as_solver_target` to `GraphTargetPolicy`,
- changing `selectExplicitSolverTransitionTarget()` to read generated targets,
- changing `solveExpectedReward()` to read generated targets,
- changing `toContributionResult()` to report generated targets,
- falling back from missing generated targets to explicit targets,
- accepting explicit/generated mismatches.

## Required design split for any future substitution

Any future runtime target substitution must be a separate semantic model, not a hidden policy option on the current solver.

A future design must introduce separate names for:

- explicit-target solver output,
- generated-target solver output,
- explicit-target contribution output,
- generated-target contribution output,
- baseline comparison output.

The future design must also state whether expected reward baselines are expected to remain equal or intentionally change.

## Current approved path

The approved runtime path remains:

```text
solveExpectedRewardWithGeneratedTargetGate(model)
  -> expand generated-target graph
  -> validate require_generated_match
  -> reject missing generated target before model evaluation
  -> reject explicit/generated mismatch before model evaluation
  -> evaluate model
  -> solve through existing explicit-target solver
```

## Representative expected reward baseline

The representative Sugoroku expected reward baseline remains:

```text
start: 2.25
position 1: 1.5
position 2: 1
position 3: 0
```

Runtime target substitution may not be introduced in a PR that changes this baseline implicitly.

## Completion boundary

This decision closes the v0.6 generated-target solver integration boundary as validation-gated explicit solving.

The next safe implementation work is not generated-target substitution.

The next safe implementation work is to improve reporting around the existing gate, such as:

- exposing validation result summaries,
- documenting gate failure messages,
- adding examples for accepted and rejected models,
- keeping solver and contribution targets explicit.
