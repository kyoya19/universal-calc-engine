# Scenario comparison

## Purpose

Scenario comparison evaluates one external parameterized model under two supplied parameter sets and returns structured differences between the resulting forward evaluations.

The intended use is:

```text
same model structure
+ baseline parameters
+ candidate parameters
→ baseline forward result
→ candidate forward result
→ structured delta
```

The public entry point is:

```text
compareExternalModelScenarios
```

and the JSON serializer is:

```text
scenarioComparisonResultToJson
```

## Why one model is reused

The comparison API parses one external model document and replaces only its supplied parameter values for the two runs.

This avoids comparing unrelated model structures while calling the result a parameter sensitivity calculation.

The external document's embedded `parameterValues`, if present, are not used as the two scenarios. The caller supplies explicit `baseline` and `candidate` parameter sets to the comparison API.

## Parameter comparison

All declared parameter values are resolved for both scenarios, including defaults and formula-based defaults.

The result includes:

```text
valuesByParameter
changedParameterIds
```

Each parameter row contains:

```text
baseline
candidate
delta = candidate - baseline
changed
```

This means the comparison reports resolved scenario values rather than only the literal fields supplied by the caller.

## Forward result delta

The current common delta includes:

```text
expectedReward
expectedElapsedTimeSeconds
rewardPerSecond
rewardPerHour
optional reachabilityProbabilityFromStart
```

The sign convention is always:

```text
candidate - baseline
```

A positive elapsed-time delta therefore means the candidate takes longer. A negative elapsed-time delta means it is faster.

Reward-rate deltas are `null` when either scenario has a `null` rate because a zero expected-time denominator prevents a finite rate comparison.

## Reachability

When reachability targets are requested through the shared forward-evaluation options, the same target set is used for both scenarios.

The comparison checks that the resulting target structures match before returning a reachability delta.

## Contribution delta

The comparison includes:

```text
contributionDeltaKind: 'difference_of_existing_contributions'
```

This wording is intentional.

For each transition row, the API returns:

```text
baselineContribution
candidateContribution
delta
```

where the contribution values are the already-defined forward contribution rows for each scenario.

This is **not** a claim that the entire scenario difference has a unique additive causal attribution.

If several parameters change at once, interaction effects can make multiple attribution schemes valid. A later sensitivity, marginal, counterfactual, or Shapley-style layer must define its method explicitly before it claims a parameter-level decomposition.

## Named reward axes

For `reward_axes` models, comparison also returns:

```text
rewardAxesDelta.expectedRewardByAxis
rewardAxesContributionDelta
```

Axes remain independent.

For example:

```text
revenue delta = +400 JPY
cost delta = -50 JPY
```

is not automatically converted to a `+450 JPY` net result by this API. A caller must explicitly define any cross-axis accounting rule.

## Failure stages

Scenario comparison distinguishes where failure occurred:

```text
shared_input
baseline
candidate
comparison
```

`shared_input` means the common external model document could not be parsed or shape-checked.

`baseline` or `candidate` means that scenario failed in the existing forward facade. Each mapped issue retains the facade's source stage, such as:

```text
parameter_resolution
model_validation
evaluation_options
evaluation
```

`comparison` is reserved for an internal structural mismatch discovered after both forward evaluations succeeded.

## Convergence

A scenario comparison can succeed with:

```text
ok: true
converged: false
```

when at least one underlying forward solve reaches the configured iteration limit.

The full baseline and candidate facade results remain available, including their detailed solver diagnostics.

The caller must inspect `converged` before treating the delta as a comparison of final converged values.

## Representative example

The repository includes:

```text
packages/core/examples/scenario_comparison.ts
```

The example reuses one generic two-outcome model.

Baseline:

```text
successProbability = 0.40
successReward = 200
attemptMinutes = 2
```

Candidate:

```text
successProbability = 0.60
successReward = 200
attemptMinutes = 1.5
```

Expected deltas include:

```text
expected reward: +40
expected elapsed time: -30 seconds
reward rate: +2400/hour
reachability(success): +0.20
```

The contribution row for the success transition also changes by +40 because the existing per-transition contribution changes from 80 to 120.

That row difference is descriptive. It is not a unique decomposition of the combined effects of probability and time changes.

## Relationship to sensitivity analysis

This comparison layer is the foundation for later sensitivity analysis because it establishes:

- one shared model structure,
- two explicit resolved parameter sets,
- complete forward results for both scenarios,
- machine-readable result deltas,
- contribution-row deltas without overstating attribution.

A later one-at-a-time sensitivity API can generate candidate scenarios that change exactly one parameter and label the result accordingly.

A multi-parameter attribution API must define its counterfactual ordering or attribution method explicitly.
