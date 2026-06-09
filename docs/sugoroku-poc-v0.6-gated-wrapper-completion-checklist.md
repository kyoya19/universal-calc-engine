# Sugoroku PoC v0.6 Gated Wrapper Completion Checklist

## Purpose

This document records the completion boundary for the v0.6 generated-target solver gated wrapper.

The gated wrapper validates generated-target readiness before running the existing explicit-target solver.

This document does not approve runtime target substitution.

## Completed runtime boundary

The completed runtime boundary is:

```text
generated-target validation gate -> existing explicit-target solver
```

The wrapper rejects invalid generated-target readiness before model evaluation and solver execution.

The wrapper only calls the existing solver after validation succeeds.

## Preserved invariants

The current solver invariant remains:

```text
solver target = transition.to
```

The current contribution invariant remains:

```text
contribution target = transition.to
```

`generatedTo` remains diagnostic and validation data. It is not used as the solver target or contribution target.

## Completed implementation items

- `solveExpectedRewardWithGeneratedTargetGate()` exists.
- The wrapper expands the generated-target graph before evaluating the model.
- The wrapper validates `require_generated_match` before solving.
- Missing generated targets are rejected before model evaluation.
- Explicit/generated mismatches are rejected before model evaluation.
- Accepted models are evaluated and solved through the existing explicit-target solver.
- The wrapper returns the evaluated model and solved model after acceptance.
- The wrapper returns the validation rejection after failure.

## Completed regression coverage

Regression tests prove:

1. validation success runs the existing explicit-target solver,
2. representative expected reward values remain unchanged,
3. missing generated target rejects before solving,
4. missing generated target rejects before model evaluation,
5. explicit/generated mismatch rejects before solving,
6. explicit/generated mismatch rejects before model evaluation,
7. contribution output remains explicit-target based after the gate accepts.

## Representative expected reward baseline

The representative Sugoroku expected reward baseline remains:

```text
start: 2.25
position 1: 1.5
position 2: 1
position 3: 0
```

Any change to these values remains outside the v0.6 gated wrapper boundary.

## Out of scope

The following remain out of scope:

- selecting `generatedTo` as a solver target,
- changing `solveExpectedReward()` internals,
- changing `toContributionResult()` internals,
- adding `generated_candidate_as_solver_target` as a runtime policy,
- falling back from missing generated targets to explicit targets,
- accepting explicit/generated mismatches,
- changing expected reward semantics.

## Next safe boundary

The next safe boundary is a design-only decision document for whether runtime target substitution should ever be allowed.

That document must decide at least:

- whether `generated_candidate_as_solver_target` remains rejected,
- whether runtime target substitution needs a separate model type,
- whether explicit targets and generated targets require separate outputs,
- whether contribution output can ever report generated targets,
- how expected reward baseline changes would be approved.

No runtime target substitution should be implemented before that design document is merged.
