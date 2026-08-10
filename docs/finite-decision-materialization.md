# Finite decision policy materialization

## Purpose

This adapter connects the typed finite decision-process layer to the existing Kiyotan forward v1 fixed stochastic-process model without changing either public contract.

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

The adapter does not infer a policy from an optimal result. It never chooses one action from `bestActionIdsByState` and never introduces an implicit tie-breaker.

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

## Canonical P0 validation and snapshot

Materialization reuses the existing:

```text
evaluateFiniteDecisionPolicy
```

as the canonical validation, resource-boundary, and Bellman-evaluation pass for:

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

The evaluator runs against an internal recording wrapper. The wrapper copies the callback values that the P0 evaluator actually validates and consumes.

The resulting internal snapshot records the validated fixed-policy view of:

```text
state keys
terminal status
selected-action outcomes
probability
reward
elapsedTimeSeconds
outcome order and multiplicity
next-state object used by the validated traversal
```

This snapshot module is package-internal and is not exported from the package root.

A failed P0 evaluation is still returned as:

```text
stage: decision_process_preflight
```

with the original `FiniteDecisionFailure` and diagnostics. The adapter does not redefine P0 failures.

## Single-snapshot consistency boundary

Earlier materialization performed two callback passes:

```text
P0 preflight callbacks
↓
second materialization capture callbacks
```

That architecture could mix two different analytical snapshots if an impure callback returned different values on the second call. A process could keep the same state graph while changing only:

```text
probability
reward
elapsedTimeSeconds
outcome ordering
outcome multiplicity
```

and the second captured `DefinitionModel` could then differ from the process that P0 had evaluated.

Materialization now uses:

```text
original process callbacks
↓
one recorded validated P0 traversal
├─ fixed-policy Bellman evaluation
└─ DefinitionModel materialization
```

After the validated traversal succeeds, materialization does not call the original process callbacks again.

This is not an expected-value comparison. The exact captured outcome rows are reused, including separate same-target outcomes.

For stable analytical callbacks, public results are unchanged. For callbacks that would mutate between a first and second capture, there is no second capture to mix into the operation.

## Callback execution impact

The change does not add comparison calls.

For materialization, the previous second callback pass is removed. The recording wrapper also caches callback results during the P0 traversal, so repeated access to the same recorded state/action view does not invoke the original callback again.

The public `evaluateFiniteDecisionPolicy` signature and standalone behavior are unchanged.

## DefinitionModel mapping

For each reachable state under the fixed policy:

```text
validated stateKey
→ StateDefinition.id
```

Terminal states become:

```text
{ id: stateKey, terminal: true }
```

For a nonterminal state, only the caller-selected action is materialized. Each captured nonzero-probability outcome becomes one explicit transition:

```text
from
= current stateKey

to
= captured next-state key

probability
= captured outcome.probability

reward
= captured outcome.reward, when supplied

elapsedTime
= { value: captured outcome.elapsedTimeSeconds, unit: 'seconds' }, when supplied
```

No generic `State` value is copied into `StateProperties`. Domain-specific state metadata remains outside `DefinitionModel`.

The adapter does not use generated targets or `state_generation`. Every materialized transition has an explicit existing-v1 `from`, `to`, and probability.

## Reachability and outcome preservation

Only states reached through nonzero-probability outcomes under the supplied fixed policy are materialized.

A zero-probability branch contributes no reachable state or transition to the explicit model. This preserves the existing P0/materialization boundary.

Distinct outcomes are not merged merely because they have the same target state. Two outcomes may share `to` while carrying different reward or elapsed-time values, so they remain separate transitions in their captured order.

State array order is not part of the `DefinitionModel` semantic contract.

## Internal consistency checks

The materializer checks that the successful P0 result and its recorded snapshot agree on the internal reachable structure required to build the explicit model, including:

```text
start state presence
reachable state-key presence
terminal versus policy-action status
selected-action outcome snapshot presence
positive-probability target presence
```

An internal mismatch uses the existing materialization-stage failure shape rather than returning a partial model.

The completed model is always passed through:

```text
validateDefinitionModel
```

A validation failure remains:

```text
stage: definition_model_validation
```

rather than returning an invalid model as success.

## Mathematical equivalence target

For a finite acyclic process and caller-supplied policy, the intended equivalence remains:

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

The typed forward path can also be used directly:

```text
FiniteDecisionProcess
↓
materializeFiniteDecisionPolicy
↓
evaluateDefinitionModel
↓
ForwardEvaluationResult
↓
ForwardResultHandoff schemaVersion: 1
```

Focused tests fix reward/time parity through this end-to-end bridge.

## Stack-safety boundary

The snapshot recorder delegates traversal to the existing stack-safe P0 fixed-policy evaluator. It does not add recursive graph traversal.

Deep finite materialization therefore remains governed by the configured:

```text
maxStates
maxStateActionPairs
maxDepth
```

rather than JavaScript function-recursion depth.

## Compatibility boundary

This increment does not change:

```text
DefinitionModel
TransitionDefinition
transition.to solver semantics
FiniteDecisionProcess
DeterministicDecisionPolicy
evaluateFiniteDecisionPolicy public signature
FixedPolicyEvaluationResult semantics
FiniteDecisionDiagnostics semantics
public P0 failure codes
optimizeFiniteDecisionExpectedReward
materializeFiniteDecisionPolicy public signature
ExternalModelDocument schemaVersion: 1
ForwardResultHandoff schemaVersion: 1
Seikatan reverse contracts
```

It is an internal consistency hardening of the existing typed bridge.

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
