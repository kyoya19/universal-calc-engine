# Acyclic direct DefinitionModel solver

## Purpose

The core now has an additive deterministic direct solver for finite explicit acyclic `DefinitionModel` values.

It does not replace the existing iterative Kiyotan solvers and is not used by the forward facade by default.

The direct path is:

```text
DefinitionModel
↓
validateDefinitionModel
↓
expandModel
↓
evaluateModel
↓
stack-safe topological analysis
↓
one reverse dynamic-programming pass
├─ expected reward
├─ expected elapsed time
└─ optional reachability probability
```

No Monte Carlo fallback is used.

## Public API

```text
solveAcyclicDefinitionModel(
  model: DefinitionModel,
  options?: {
    reachabilityTargets?: Iterable<StateId>
  }
): AcyclicDirectEvaluationResult
```

The success result contains:

```text
expectedReward: SolvedModel
expectedElapsedTime: ExpectedElapsedTimeResult
reachability?: ReachabilityResult
validation: ModelValidationResult
diagnostics: AcyclicDirectDiagnostics
```

The implementation uses JavaScript `number` / Float64. `direct` means a finite topological dynamic-programming evaluation rather than an iterative convergence loop; it does not mean rational or symbolic exact arithmetic.

## Mathematical semantics

For terminal states:

```text
V(s) = 0
T(s) = 0
```

For a nonterminal state:

```text
V(s) = Σ_t p_t * (reward_t + V(to_t))

T(s) = Σ_t p_t * (elapsedTimeSeconds_t + T(to_t))
```

For reachability targets:

```text
R(s) = 1
```

for every requested target state, including a nonterminal target.

For non-target terminal states:

```text
R(s) = 0
```

For other nonterminal states:

```text
R(s) = Σ_t p_t * R(to_t)
```

These are the same Bellman equations used by the existing iterative solvers.

## Topological architecture

The solver uses Kahn-style topological processing over the effective dependency graph.

Each explicit state is entered into the indegree table once. Each effective transition is processed once during topological ordering. The resulting order is traversed once in reverse for dynamic programming.

This is stack-safe and does not use recursive DFS.

Shared downstream states in a DAG are therefore solved once and their already-computed values are reused by every predecessor.

Distinct transitions are never merged merely because they have the same target. Same-target multiple outcomes remain separate Bellman terms.

## Terminal outgoing transitions

Existing validation permits outgoing transitions on terminal states as a warning:

```text
terminal_state_has_transitions
```

Existing Kiyotan reward, elapsed-time, and reachability solvers ignore those outgoing transitions after a state is terminal.

The direct solver uses the same semantic boundary. Terminal outgoing transitions are excluded from the effective dependency graph and do not create a direct-solver cycle.

## Cycle handling

The direct solver is only for acyclic effective dependency graphs.

If Kahn processing cannot order every state, it returns:

```text
ok: false
failure.code: cycle_detected
```

with the unresolved state ids.

There is no implicit fallback to the iterative solver and no Monte Carlo fallback.

## Validation and reachability failures

The input `DefinitionModel` is first passed through the existing `validateDefinitionModel`.

Invalid models return:

```text
failure.code: model_validation_failed
```

An unknown requested reachability target returns:

```text
failure.code: unknown_reachability_target
```

Unexpected expansion/evaluation or internal dependency failures use:

```text
failure.code: evaluation_failed
```

## Diagnostics

Success and failure results include direct-solver diagnostics:

```text
solverMethod: topological_reverse_dynamic_programming
simulationUsed: false
numericRepresentation: javascript_number_float64
stateCount
effectiveTransitionCount
topologicalStateCount
dynamicProgrammingPasses: 1
```

These diagnostics are independent of the existing `SolverConvergenceDiagnostics` because this solver does not iterate toward a tolerance and has no convergence iteration count.

That separation is also why this increment does not add the direct solver to `ForwardEvaluationOptions` yet.

## Parity boundary

Focused tests compare direct results with the existing iterative Kiyotan solvers for finite acyclic models across:

```text
expected reward
expected elapsed time
reachability probability
```

Coverage includes a DAG with a shared downstream state and multiple transitions to the same target.

The direct solver is also tested through:

```text
FiniteDecisionProcess
+
caller-supplied DeterministicDecisionPolicy
↓
materializeFiniteDecisionPolicy
↓
DefinitionModel
↓
solveAcyclicDefinitionModel
```

The resulting expected reward and expected elapsed time are compared with both `evaluateFiniteDecisionPolicy` and the existing iterative Kiyotan solvers.

A 20,000-depth acyclic chain is covered to fix the stack-safety boundary.

## Existing defaults remain unchanged

This increment does not change the default behavior of:

```text
solveExpectedRewardWithDiagnostics
solveExpectedElapsedTimeWithDiagnostics
solveReachabilityProbabilityWithDiagnostics
evaluateDefinitionModel
evaluatePreparedExternalModel
evaluateExternalModelInput
evaluateExternalModelJson
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
ForwardResultHandoff schemaVersion: 1
FiniteDecisionProcess P0
materializeFiniteDecisionPolicy
Seikatan reverse contracts
```

It adds an independent analytical solver surface only.

## Deliberately not added

This increment does not add:

```text
automatic direct-solver selection
ForwardEvaluationOptions solver-method selection
iterative-to-direct fallback
direct-to-iterative fallback
cyclic MDP optimality
value iteration changes
policy iteration
Monte Carlo fallback
rational arithmetic
DecisionResultHandoff
external decision-process JSON
domain-specific production types
```
