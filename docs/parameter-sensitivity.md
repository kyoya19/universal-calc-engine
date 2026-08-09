# One-at-a-time parameter sensitivity

## Purpose

The sensitivity API evaluates how forward results change when exactly one selected model parameter is varied while the caller's baseline parameter set is held fixed.

Public entry point:

```text
analyzeParameterSensitivity
```

JSON serializer:

```text
parameterSensitivityResultToJson
```

The result declares:

```text
sensitivityKind: one_at_a_time
```

This is an explicit counterfactual boundary. It is not a general multi-parameter attribution algorithm.

## Input

The API accepts:

```text
one external model
+ baseline parameter values
+ selected parameterId
+ one or more candidate values
+ optional forward-evaluation options
```

For every candidate value, the candidate parameter set is constructed as:

```text
candidate = baseline parameters
candidate[selected parameter] = candidate value
```

No other supplied parameter is changed by the sensitivity layer.

Parameter defaults remain available through the existing parameter resolver.

## Result

A successful result contains:

```text
modelKind
sensitivityKind
parameterId
baselineValue
converged
points[]
```

Each point contains the candidate value and the existing structured scenario-comparison result.

This means each point can expose:

- changed parameter values
- expected reward delta
- expected elapsed-time delta
- reward-rate delta
- optional reachability delta
- existing contribution-row deltas
- named reward-axis deltas when present
- full baseline/candidate forward results
- solver convergence diagnostics through those forward results

## Counterfactual semantics

The interpretation of one point is:

```text
What changes in the forward results if this one parameter is changed from its baseline resolved value to the candidate value, while the other supplied baseline parameters stay fixed?
```

This is stronger than an arbitrary multi-parameter scenario difference because the changed variable is explicit.

It is still not a derivative. Candidate values can be discrete and can be far from the baseline.

It is also not automatically a causal claim about the external world. The result is conditional on the supplied model structure being an appropriate representation of the problem.

## Relationship to contribution

The underlying scenario comparison returns:

```text
contributionDeltaKind: difference_of_existing_contributions
```

Those row differences remain descriptive differences between solved scenarios.

When only one model parameter is deliberately varied, the counterfactual interpretation is clearer, but the API still does not rename row differences as a unique causal decomposition.

## Named reward axes

The same sensitivity API works with `reward_axes` external models because it reuses scenario comparison.

Named axes remain independent. A revenue-axis delta and cost-axis delta are not implicitly netted together.

## Failure stages

The sensitivity layer distinguishes:

```text
shared_input
sensitivity_options
baseline_parameter_resolution
candidate
```

Examples:

- invalid external model shape → `shared_input`
- unknown selected parameter → `sensitivity_options`
- missing required baseline parameter → `baseline_parameter_resolution`
- candidate value makes a probability invalid → `candidate`, retaining `model_validation` as the source stage

Candidate values must be finite numbers and at least one candidate value must be supplied.

## Convergence

A sensitivity run can return:

```text
ok: true
converged: false
```

if one or more underlying candidate comparisons contain a forward solve that did not converge within the configured iteration limit.

The full comparison results keep the underlying diagnostics.

## Current scope

This feature deliberately does not add:

- numerical derivatives
- automatic candidate-grid generation
- multi-parameter sweeps
- ordered marginal attribution
- Shapley attribution
- Bayesian inference
- observation-driven parameter fitting

Those are separate analytical layers and should be added only with explicit semantics.
