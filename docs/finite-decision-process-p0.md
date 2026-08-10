# Finite decision process P0

## Purpose

This module adds a generic typed finite decision-process analytical layer above the existing Kiyotan forward v1 contract.

It does not change `DefinitionModel`, explicit `transition.to` semantics, the external model schema, or `ForwardResultHandoff`.

The P0 layer separates two different questions:

```text
fixed policy evaluation
!=
optimal policy search
```

## Typed process contract

Public core types:

```text
DecisionActionId
DecisionOutcome<State>
FiniteDecisionProcess<State>
DeterministicDecisionPolicy<State>
FiniteDecisionProcessOptions
FiniteDecisionDiagnostics
```

A decision process supplies:

```text
startState
stateKey(state)
isTerminal(state)
actions(state)
outcomes(state, actionId)
```

An outcome supplies:

```text
probability
nextState
optional reward
optional elapsedTimeSeconds
```

The process is generative: state-dependent probabilities and next states are produced by `outcomes(state, actionId)`. P0 therefore does not require a new declarative `state_property_ref` grammar or dynamic external JSON schema.

## Fixed-policy evaluation

Public API:

```text
evaluateFiniteDecisionPolicy
```

The supplied policy is deterministic and selects one available action for each reachable nonterminal state.

The solver evaluates the Bellman expectation equation:

```text
V^pi(s)
= sum_o p(o | s, pi(s)) * [reward_o + V^pi(s'_o)]
```

It also evaluates expected elapsed time under that fixed policy using the same reachable stochastic branches.

The policy is supplied; this API does not optimize or reinterpret it.

## Expected-reward optimality

Public API:

```text
optimizeFiniteDecisionExpectedReward
```

For each reachable state/action pair:

```text
Q*(s,a)
= sum_o p(o | s,a) * [reward_o + V*(s'_o)]
```

and:

```text
V*(s) = max_a Q*(s,a)
```

P0 optimizes only:

```text
expected_total_reward
```

It does not optimize `E[reward] / E[elapsed time]`.

All actions whose values are equal within `actionValueTolerance` are preserved in `bestActionIdsByState`. The solver does not invent a single winner for a tie.

## Exactness boundary

P0 uses:

```text
finite reachable states
acyclic recursion
memoization
deterministic enumeration of all returned stochastic outcomes
```

No Monte Carlo sampling or sampling fallback is used.

The implementation uses JavaScript / TypeScript `number`, so this is deterministic full-branch evaluation using IEEE-754 floating point. It is not a rational-arithmetic exactness claim.

Diagnostics therefore record:

```text
simulationUsed: false
numericRepresentation: javascript_number_float64
```

## Validation boundary

Probability normalization is checked per state/action pair:

```text
for every evaluated (state, action):
sum outcomes.probability = 1
```

This intentionally differs from `DefinitionModel`, where the fixed stochastic model validates one outgoing probability distribution per nonterminal state.

P0 also rejects:

- empty action sets on nonterminal states;
- duplicate/empty action ids;
- fixed policies selecting unavailable actions;
- actions with no outcomes;
- invalid probabilities;
- non-finite rewards;
- negative/non-finite elapsed time;
- cycles;
- configured state/depth/state-action resource limits.

Terminal states have zero downstream value and do not require actions or outcomes.

## State-space controls

P0 traverses only reachable states and memoizes by the caller-supplied `stateKey`.

Controls:

```text
maxStates
maxStateActionPairs
maxDepth
```

Limit exhaustion returns a structured failure. The solver never silently truncates, samples, or switches to Monte Carlo.

`stateKey(state)` is the identity contract for memoization. Callers must return the same key exactly when two state values are analytically equivalent for the decision process.

## Compatibility

P0 does not modify:

```text
DefinitionModel
TransitionDefinition
transition.to
state_generation target selection
ExternalModelDocument schemaVersion: 1
ForwardEvaluationResult
ForwardResultHandoff schemaVersion: 1
Seikatan reverse contracts
```

The existing Kiyotan v1 remains the explicit fixed stochastic-process evaluator.

A future adapter may materialize a finite decision process plus a fixed policy into an explicit `DefinitionModel`, but P0 does not add that adapter yet.

## Deliberately unsupported in P0

```text
external decision-process JSON
state_property_ref declarative formulas
declarative state mutation grammar
DecisionResultHandoff
cyclic MDP optimality
value iteration
policy iteration
reward-rate optimization
continuous/infinite state spaces
Monte Carlo fallback
rational arithmetic backend
```

These are separate extensions and must not be inferred from the P0 typed API.
