# Acyclic direct forward evaluation

## Purpose

The core now has an additive typed forward adapter for the existing acyclic direct solver.

The adapter keeps the direct solver separate from the iterative forward-v1 facade while exposing the same forward-facing output concepts for finite explicit acyclic `DefinitionModel` values.

The path is:

```text
DefinitionModel
↓
solveAcyclicDefinitionModel
↓
existing forward output converters
├─ OutputResult
├─ ForwardElapsedTimeOutput
├─ RewardRateResult
├─ ContributionResult
└─ optional ForwardReachabilityOutput
+
AcyclicDirectDiagnostics
```

The existing iterative `evaluateDefinitionModel`, external-input evaluation, `ForwardEvaluationResult`, `ForwardEvaluationOptions`, and `ForwardResultHandoff schemaVersion: 1` are unchanged.

## Public API

```text
evaluateAcyclicDirectDefinitionModel(
  model: DefinitionModel,
  options?: AcyclicDirectOptions
): AcyclicDirectForwardResult
```

A successful result contains:

```text
ok: true
validation: ModelValidationResult
expectedReward: OutputResult
expectedElapsedTime: ForwardElapsedTimeOutput
rewardRate: RewardRateResult
contribution: ContributionResult
diagnostics: AcyclicDirectDiagnostics
reachability?: ForwardReachabilityOutput
```

A failure is the existing `AcyclicDirectEvaluationFailure` shape. The adapter does not translate direct failures into iterative convergence failures.

## Reused calculation and output logic

The adapter delegates all direct reward, elapsed-time, reachability, cycle, and validation semantics to:

```text
solveAcyclicDefinitionModel
```

It then reuses the existing:

```text
toOutputResult
toRewardRateResult
toContributionResult
```

The elapsed-time and reachability forward-output conversions that were previously private to `forward_evaluation.ts` are now package-internal shared helpers used by both the iterative forward facade and this direct adapter.

No reward-rate formula, contribution formula, elapsed-output mapping, or reachability-output mapping is reimplemented in the adapter.

The adapter performs one additional `expandModel` / `evaluateModel` pass after a successful direct solve only to supply the existing `toContributionResult` helper with the evaluated transition rows. It does not rerun an iterative reward, elapsed-time, or reachability solver.

## Diagnostics boundary

The adapter preserves:

```text
AcyclicDirectDiagnostics
```

including:

```text
solverMethod: topological_reverse_dynamic_programming
simulationUsed: false
numericRepresentation: javascript_number_float64
stateCount
effectiveTransitionCount
topologicalStateCount
dynamicProgrammingPasses: 1
```

These are not converted into `SolverConvergenceDiagnostics` and do not acquire fake `iterations`, `tolerance`, or `converged` fields.

That distinction is why this increment does not add a solver-method selector to `ForwardEvaluationOptions`.

## Output parity target

For a finite explicit acyclic model, the adapter and the existing iterative `evaluateDefinitionModel` are expected to agree on:

```text
expected reward output
expected elapsed-time output
reward rate
transition contribution
reachability output
```

within the numerical semantics already fixed by the underlying solvers.

Focused tests cover same-target multiple transitions, zero-probability dependency semantics, terminal outgoing transitions, and fixed-policy decision materialization.

## Zero-probability boundary

The underlying direct solver ignores evaluated `probability === 0` transitions as numerical dependencies for topological analysis and direct dynamic programming.

The forward contribution output intentionally retains those original transition rows. Their contribution is zero because the existing contribution formula multiplies by the transition probability.

This keeps both boundaries at once:

```text
zero-weight edge is not a direct-solver dependency
zero-weight row remains visible in contribution output
```

## Decision-process bridge

The complete typed fixed-policy path can now be:

```text
FiniteDecisionProcess
+
caller-supplied DeterministicDecisionPolicy
↓
materializeFiniteDecisionPolicy
↓
DefinitionModel
↓
evaluateAcyclicDirectDefinitionModel
↓
direct forward outputs
```

Focused tests compare this path with both `evaluateFiniteDecisionPolicy` and the existing iterative `evaluateDefinitionModel` path.

No optimal-policy action is chosen automatically and no implicit tie-breaking is introduced.

## Existing defaults remain unchanged

This increment does not change:

```text
evaluateDefinitionModel
evaluatePreparedExternalModel
evaluateExternalModelInput
evaluateExternalModelJson
ForwardEvaluationOptions
ForwardEvaluationResult
ForwardResultHandoff schemaVersion: 1
```

The iterative solver remains the forward-v1 default.

## Unchanged contracts

This increment does not change:

```text
DefinitionModel
TransitionDefinition
explicit transition.to semantics
ExternalModelDocument schemaVersion: 1
FiniteDecisionProcess P0
materializeFiniteDecisionPolicy
Seikatan reverse contracts
```

## Deliberately not added

This increment does not add:

```text
ForwardEvaluationOptions solver-method selection
automatic direct/iterative switching
ForwardResultHandoff changes
DecisionResultHandoff
external decision-process JSON
cyclic MDP optimality
value iteration changes
policy iteration
Monte Carlo fallback
rational arithmetic
domain-specific production types
```
