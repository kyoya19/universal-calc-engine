# Generated Target Solver Runtime Adapter Boundary

## Purpose

This document defines the next boundary after v0.6 generated-target solver planning completion.

The goal is to identify where a future generated-target validation result may be connected to solver execution without changing solver semantics in the same PR.

This document does not approve generated-target solver runtime execution.

## Current runtime invariant

The current solver runtime invariant remains:

```text
solver target = transition.to
```

The contribution runtime invariant also remains:

```text
contribution target = transition.to
```

No runtime call site may use `generatedTo` as a solver or contribution target in this boundary.

## Adapter boundary

The adapter boundary is between graph validation and solver execution.

The boundary has two stages:

1. validate generated-target readiness from an expanded graph,
2. run the existing explicit-target solver only when validation passes.

The adapter must not rewrite `transition.to`.

The adapter must not replace an evaluated transition target with `generatedTo`.

The adapter must not change contribution output.

## Proposed adapter shape

The future adapter may use a shape equivalent to:

```text
validateGeneratedTargetSolverPlanningBoundary(graph)
  -> reject before solving when missing/mismatch exists
  -> otherwise allow existing explicit-target solver to run unchanged
```

The adapter output should be a gate, not a target mapper.

## Approved behavior for the first adapter PR

The first adapter PR may:

- accept a model and expanded graph,
- validate `require_generated_match`,
- reject before solving when a generated target is missing,
- reject before solving when explicit/generated targets mismatch,
- call the current explicit-target solver only after validation succeeds,
- prove expected reward values remain unchanged.

## Disallowed behavior for the first adapter PR

The first adapter PR must not:

- select `generatedTo` as the solver target,
- modify `selectExplicitSolverTransitionTarget()`,
- change `solveExpectedReward()` internals,
- change `toContributionResult()` internals,
- add `generated_candidate_as_solver_target` as a runtime policy,
- fallback from missing generated targets to explicit targets,
- use generated targets when explicit targets mismatch,
- change the representative Sugoroku expected reward baseline.

## Expected reward baseline

The adapter boundary must preserve:

```text
start: 2.25
position 1: 1.5
position 2: 1
position 3: 0
```

Any change to these values requires a later semantic-change PR.

## Contribution boundary

Contribution output remains explicit-target based:

```text
contribution output target = transition.to
```

The first adapter PR may assert this invariant, but it must not introduce generated-target contribution reporting.

## Next safe implementation PR

The next safe implementation PR after this document is a gated wrapper, not a solver rewrite.

The wrapper should prove:

1. validation failure prevents solver execution,
2. validation success runs the existing solver unchanged,
3. representative expected rewards remain unchanged,
4. contribution output remains explicit-target based.

Runtime target substitution remains outside that PR.
