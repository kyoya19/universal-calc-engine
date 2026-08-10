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

## Canonical P0 validation and one analytical snapshot

Materialization runs the existing:

```text
evaluateFiniteDecisionPolicy
```

exactly once through an internal recording wrapper around the caller's `FiniteDecisionProcess`.

The wrapper does not reimplement P0 validation. P0 remains the canonical validation and resource-boundary implementation for:

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

When `outcomes(state, selectedAction)` is called by that validated P0 traversal, the wrapper immediately copies the returned analytical outcome values and gives those same copies to P0. As P0 resolves nonzero outcome targets through `stateKey`, their resolved target keys are attached to that internal snapshot.

The resulting flow is therefore:

```text
process callbacks
↓
one stack-safe validated P0 traversal
↓
validated fixed-policy snapshot
├─ Bellman fixed-policy evaluation
└─ explicit DefinitionModel materialization
```

After the P0 traversal succeeds, DefinitionModel materialization uses only the recorded snapshot. It does not call `process.outcomes` or `process.stateKey` again.

A failed P0 traversal is still returned as `stage: decision_process_preflight` with the original `FiniteDecisionFailure` and diagnostics. The adapter does not redefine those P0 failures.

## Why the single snapshot matters

The original bridge used two callback passes:

```text
P0 preflight callbacks
↓
second callback capture for DefinitionModel
```

That design detected large graph changes, but it could still combine two different analytical states when callbacks changed while preserving a valid graph. For example, a second callback pass could change only:

```text
probability
reward
elapsedTimeSeconds
outcome ordering
same-target outcome multiplicity
```

and still produce a DefinitionModel that passed `validateDefinitionModel`.

Materialization now has no second callback pass. A callback that would return different data on a hypothetical second invocation cannot replace values already validated and evaluated by P0 during the same materialization operation.

This is a snapshot-consistency guarantee, not an endorsement of mutable analytical callbacks. `FiniteDecisionProcess` callbacks should still represent stable model definitions.

## Callback execution boundary

For a successful fixed-policy materialization, selected-action outcome callbacks are now executed only as part of `evaluateFiniteDecisionPolicy`.

Compared with the former two-pass bridge:

```text
process.outcomes for a reachable selected (state, action)
former bridge: P0 pass + capture pass
current bridge: P0 pass only

process.stateKey for start/nonzero outcome targets
former bridge: P0 pass + capture pass
current bridge: P0 pass only
```

The adapter does not add extra comparison calls in an attempt to detect mutation. Re-running callbacks would create another analytical snapshot rather than strengthening the existing one.

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

For a nonterminal state, only the caller-selected action is materialized. Each nonzero-probability outcome from the validated snapshot becomes one explicit transition:

```text
from
= current stateKey

to
= validated outcome target stateKey

probability
= validated outcome.probability

reward
= validated outcome.reward, when supplied

elapsedTime
= { value: validated outcome.elapsedTimeSeconds, unit: 'seconds' }, when supplied
```

No generic State value is copied into `StateProperties`. Domain-specific state metadata remains outside `DefinitionModel`.

The adapter does not use generated targets or `state_generation`. Every materialized transition has an explicit existing-v1 `from`, `to`, and probability.

## Reachability and outcome preservation

Only states reachable through nonzero-probability outcomes under the supplied fixed policy are materialized.

A zero-probability branch contributes no reachable state or transition to the explicit model. This remains aligned with P0 traversal semantics.

Distinct outcomes are not merged merely because they have the same target state. Two outcomes may share `to` while having different probability, reward, or elapsed-time values, so they remain separate transitions in their validated snapshot order.

## Post-order state emission

After P0 succeeds, the adapter performs an explicit-stack traversal over the recorded state-key/outcome snapshot only. No process callback is invoked by this ordering pass.

States are emitted in dependency post-order. This is not a new `DefinitionModel` semantic requirement; state array order remains semantically irrelevant.

Post-order emission remains useful for the existing iterative v1 solvers because downstream acyclic values are available before their parents during a solver sweep.

## Snapshot consistency checks

The single validated snapshot eliminates cross-pass graph/value drift rather than comparing two independently produced callback results.

After P0 succeeds, the adapter still checks internal snapshot completeness, including:

```text
the successful start state is present
all successful P0 reachable states are present in the snapshot
selected nonterminal states have their validated outcomes
all nonzero outcomes have their stateKey resolved by the P0 traversal
```

These are consistency assertions over one validated snapshot, not a second model evaluation.

The completed model is always passed through:

```text
validateDefinitionModel
```

A validation failure is returned as `stage: definition_model_validation` rather than returning an invalid model as success.

## Mathematical equivalence target

For a stable finite acyclic process and caller-supplied policy, the intended equivalence remains:

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

The focused tests also route the materialized model through `evaluateDefinitionModel`, fixing the complete typed forward-v1 bridge.

## Stack-safety boundary

The P0 traversal remains the explicit-stack, stack-safe implementation introduced by the finite decision-process solver hardening.

The snapshot recorder adds no recursive traversal. The post-P0 state ordering pass is also explicit-stack based.

Focused coverage materializes a 20,000-depth finite acyclic chain while preserving:

```text
maxDepth
maxStates
maxStateActionPairs
reachable-state-only traversal
cycle rejection through P0
simulationUsed: false
```

## Compatibility boundary

This adapter does not change:

```text
DefinitionModel
TransitionDefinition
transition.to solver semantics
FiniteDecisionProcess
DeterministicDecisionPolicy
evaluateFiniteDecisionPolicy public signature
FixedPolicyEvaluationResult public shape
FiniteDecisionDiagnostics public shape
optimizeFiniteDecisionExpectedReward
ExternalModelDocument schemaVersion: 1
ForwardResultHandoff schemaVersion: 1
Seikatan reverse contracts
```

`materializeFiniteDecisionPolicy` also keeps its public signature and result union. Stable callback behavior is unchanged; the execution mechanism is hardened so one materialization operation uses one validated analytical snapshot.

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
