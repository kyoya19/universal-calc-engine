# Forward evaluation facade

## Purpose

The forward evaluation facade composes the existing checked input, parameter resolution, structured validation, evaluation, solver, rate, contribution, and diagnostics layers into one additive entry point.

It does not replace the lower-level APIs. Callers that need direct control over expansion, evaluation, or individual solvers can continue to use them.

## Pipeline

For external input, the facade executes the existing layers in this order:

```text
external JSON / unknown
→ checked external document parsing
→ parameter / formula resolution
→ structured model validation
→ model expansion
→ model evaluation
→ expected reward
→ expected elapsed time
→ optional reachability probability
→ ratio-of-expectations reward rate
→ contribution output
→ optional named reward-axis output and contribution
→ solver convergence diagnostics
```

The public entry points are:

```text
evaluatePreparedExternalModel
evaluateExternalModelInput
evaluateExternalModelJson
forwardEvaluationResultToJson
```

## Options

```ts
{
  reachabilityTargets?: StateId[];
  solver?: {
    maxIterations?: number;
    tolerance?: number;
  };
}
```

Reachability is optional because not every generic model has a domain-specific win state.

Unknown reachability targets are returned as an `evaluation_options` failure instead of being hidden inside a solver exception.

## Success result

A base-model success includes:

```text
modelKind
converged
validation
expectedReward
expectedElapsedTime
rewardRate
contribution
diagnostics
optional reachability
```

The reward-rate result keeps the existing `ratio_of_expectations` semantics:

```text
E[reward] / E[elapsed time]
```

It must not be read as `E[reward / elapsed time]`.

A named reward-axis model additionally includes:

```text
rewardAxes
rewardAxesContribution
reward-axis diagnostics
```

Named axes remain separate. The facade does not implicitly subtract a `cost` axis from a `revenue` axis or combine axes that happen to share a unit.

## Contribution boundary

The facade exposes the contribution structures that already exist in core.

For the legacy scalar reward path, transition contribution remains:

```text
probability × (immediate reward + downstream expected reward)
```

For named reward axes, the same calculation remains isolated per axis.

This is an integration of existing contribution behavior, not a new Shapley, counterfactual, or sensitivity-analysis algorithm.

## Non-convergence

The facade uses the diagnostic solver variants.

If a solver reaches its configured iteration limit, the facade can still return:

```text
ok: true
converged: false
```

along with the last approximation and machine-readable convergence diagnostics.

This separates:

```text
input / validation failure
```

from:

```text
a valid model whose selected iterative solve did not converge within the configured limit
```

Callers must check `converged` before treating an approximate result as final.

## Failure stages

The facade preserves the external-input stages:

```text
json_syntax
shape
parameter_resolution
model_validation
```

and adds facade-specific stages:

```text
evaluation_options
evaluation
```

Examples:

- malformed JSON → `json_syntax`
- wrong external document shape → `shape`
- missing parameter → `parameter_resolution`
- transition probabilities do not sum to one → `model_validation`
- unknown requested reachability target → `evaluation_options`
- unexpected failure after a prepared valid model reaches forward evaluation → `evaluation`

## Representative generic scenario

The repository includes:

```text
packages/core/examples/forward_evaluation.ts
```

The example is intentionally not a game-specific model.

It defines one reusable two-outcome process with three parameters:

```text
successProbability
successReward
attemptMinutes
```

Baseline scenario:

```text
successProbability = 0.40
successReward = 200 points
attemptMinutes = 2
```

Expected facade results:

```text
expected reward = 80 points
reachability(success) = 0.40
expected elapsed time = 120 seconds
reward per hour = 2400 points/hour
```

Improved scenario:

```text
successProbability = 0.60
successReward = 200 points
attemptMinutes = 1.5
```

Expected facade results:

```text
expected reward = 120 points
reachability(success) = 0.60
expected elapsed time = 90 seconds
reward per hour = 4800 points/hour
```

The same model structure is reused. Only supplied parameter values change.

This demonstrates the intended separation between model structure and scenario inputs.

## Observation boundary

Observation datasets remain separate from this forward facade.

The forward facade consumes model definitions and supplied parameters. It does not convert observed counts or observed scalar metrics into parameter values.

Later reverse-estimation work may combine:

```text
parameterized model
+ ObservationDataset
+ candidate / constraint / prior definitions
→ score / likelihood
→ estimation result
```

but that is outside this facade.

## v1 interpretation

With this facade, the current forward core has one explicit route from checked third-party input to structured forward outputs, solver diagnostics, and contribution data.

Remaining work should be selected by actual v1 gaps rather than by adding more isolated solver or formatting boundaries. Likely candidates include:

1. clarifying the v1 support matrix and limitations for third-party users,
2. adding a coherent scenario-comparison / sensitivity layer only if it reuses the parameterized model boundary cleanly,
3. improving contribution comparison across scenarios without pretending that simple additive attribution is always mathematically valid,
4. beginning minimal reverse-estimation contracts only after the forward v1 boundary is judged sufficiently stable.
