# Finite decision policy materialization

## Purpose

This adapter connects the typed finite decision-process layer to the existing Kiyotan forward v1 fixed stochastic-process model without changing either contract.

The bridge is:

```text
FiniteDecisionProcess<State>
+
caller-supplied DeterministicDecisionPolicy<State>
↓
explicit DefinitionModel
↓
existing Kiyotan forward v1
```

The adapter does not infer a policy from an optimal result. In particular, it never chooses one action from `bestActionIdsByState` and never introduces an implicit tie-breaker.

## Public API

```text
materializeFiniteDecisionPolicy(process, policy, options?)
```

Success returns:

```text
model: DefinitionModel
policyActionByState
FiniteDecisionDiagnostics
ModelValidationResult
```

The policy audit records the exact caller-selected action for every reachable nonterminal state.

## Canonical P0 preflight

Materialization first calls the existing:

```text
evaluateFiniteDecisionPolicy
```

This deliberately reuses the P0 implementation as the canonical validation and resource-boundary pass for:

```text
stateKey identity
caller-supplied deterministic policy
available action validation
probability validation per selected (state, action)
reward/time validation
cycle rejection
maxStates
maxStateActionPairs
maxDepth
process callback failures
```

A failed preflight is returned as `stage: decision_process_preflight` with the original `FiniteDecisionFailure` and diagnostics. The adapter does not redefine those P0 failures.

## DefinitionModel mapping

For each reachable state under the fixed policy:

```text
process.stateKey(state)
→ StateDefinition.id
```

Terminal states become:

```text
{ id: stateKey, terminal: true }
```

For a nonterminal state, only the caller-selected action is materialized. Each nonzero-probability outcome becomes one explicit transition:

```text
from
= current stateKey

to
= process.stateKey(outcome.nextState)

probability
= outcome.probability

reward
= outcome.reward, when supplied

elapsedTime
= { value: outcome.elapsedTimeSeconds, unit: 'seconds' }, when supplied
```

No generic State value is copied into `StateProperties`. Domain-specific state metadata remains outside `DefinitionModel`.

The adapter does not use generated targets or `state_generation`. Every materialized transition has an explicit existing-v1 `from`, `to`, and probability.

## Reachability and outcome preservation

Only states reachable through nonzero-probability outcomes under the supplied fixed policy are materialized.

A zero-probability branch contributes no reachable state or transition to the explicit model. This matches the P0 reachable-state traversal semantics while preserving probability normalization of the positive-probability branches.

Distinct outcomes are not merged merely because they have the same target state. Two outcomes may share `to` while having different reward or elapsed-time values, so they remain separate transitions.

## Post-order state emission

The capture pass uses an explicit traversal stack and emits states in dependency post-order. This is not a new `DefinitionModel` semantic requirement; state array order remains semantically irrelevant.

Post-order emission is useful for the existing iterative v1 solvers because downstream acyclic values are available before their parents during a solver sweep.

## Two-stage consistency checks

After the P0 preflight succeeds, materialization captures the process again to build the explicit model.

Finite decision-process callbacks are analytical definitions and are expected to remain stable during one materialization operation. The adapter detects important graph-level instability, including:

```text
a state appearing during capture that was absent from preflight
preflight states disappearing during capture
a cycle appearing after an acyclic preflight
an invalid final DefinitionModel
```

The completed model is always passed through:

```text
validateDefinitionModel
```

A validation failure is returned as `stage: definition_model_validation` rather than returning an invalid model as success.

## Mathematical equivalence target

For a stable finite acyclic process and caller-supplied policy, the intended equivalence is:

```text
evaluateFiniteDecisionPolicy(process, policy).expectedReward
=
solveExpectedReward(
  evaluateModel(
    expandModel(
      materializeFiniteDecisionPolicy(process, policy).model
    )
  )
)
```

and likewise for expected elapsed time.

The focused tests fix this bridge contract for a generic finite-resource example.

## Compatibility boundary

This adapter does not change:

```text
DefinitionModel
TransitionDefinition
transition.to solver semantics
FiniteDecisionProcess
DeterministicDecisionPolicy
evaluateFiniteDecisionPolicy
optimizeFiniteDecisionExpectedReward
ExternalModelDocument schemaVersion: 1
ForwardResultHandoff schemaVersion: 1
Seikatan reverse contracts
```

It is an additive typed bridge.

## Deliberately unsupported

This increment does not add:

```text
optimal-policy automatic materialization
implicit tie-breaking
ExternalDecisionProcessDocument
external decision-process JSON
state_property_ref
declarative state updates
DecisionResultHandoff
cyclic MDP materialization
value iteration
policy iteration
reward-rate optimization
Monte Carlo fallback
domain-specific production types
```
