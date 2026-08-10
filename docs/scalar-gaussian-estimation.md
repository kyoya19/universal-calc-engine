# Scalar Gaussian reverse estimation

## Purpose

This layer gives the minimal Seikatan reverse-estimation surface an explicit way to consume `scalar` observations without copying observation values into model parameters.

It remains a finite candidate search for exactly one declared parameter. Each candidate is resolved through the ordinary parameterized model boundary, the requested model-side prediction is computed, and an explicit Gaussian observation model assigns a log-likelihood density.

## Method

The method identifier is:

```text
conditionally_independent_gaussian_scalar_log_likelihood
```

For one scalar observation with observed value `y`, candidate-predicted value `mu`, and explicitly supplied standard deviation `sigma > 0`, the implementation uses the normalized Gaussian log-likelihood density:

```text
log L = -log(sigma * sqrt(2*pi)) - 0.5 * ((y - mu) / sigma)^2
```

For multiple bound scalar observations, the current contract assumes conditional independence given the candidate and adds the log-likelihood densities:

```text
log L(candidate) = sum_i log L_i(candidate)
```

The result declares this assumption as:

```text
scalar_observations_conditionally_independent_given_candidate
```

No covariance matrix or correlated-error model is implied.

## Observation-to-prediction binding

A scalar observation does not select a predictor by its `metric` string.

The caller must bind each `observationId` to an explicit model-side predictor.

Current predictors are intentionally limited to outputs with an explicit unit contract:

```text
expected_elapsed_time_seconds
reward_axis_expected_value(axisId)
```

### Expected elapsed time

`expected_elapsed_time_seconds` predicts the start state's expected elapsed time and has the fixed unit:

```text
seconds
```

The observation unit and Gaussian error-model unit must both be exactly `seconds`.

### Named reward axis

`reward_axis_expected_value` predicts the start state's expected value for one declared named reward axis.

Its unit is read from the axis definition:

```text
rewardAxes[].unit
```

The observation unit and Gaussian error-model unit must match that unit exactly.

Legacy scalar `reward` is intentionally not exposed as a scalar-observation predictor in this first contract because legacy reward has no explicit unit metadata. Reward rate is also excluded for the same reason.

## Error model

The error model is explicit:

```ts
{
  type: 'gaussian',
  standardDeviation: number,
  unit: string
}
```

`standardDeviation` must be finite and strictly positive.

The implementation does not:

- invent a default sigma;
- replace zero variance with epsilon;
- infer sigma from candidate spacing;
- infer sigma from the observed value;
- infer sigma from the parameter definition.

A zero, negative, non-finite, or missing standard deviation is a request error.

## Unit contract

The following three units must agree exactly:

```text
scalar observation unit
predictor unit
Gaussian error-model unit
```

No unit conversion is performed.

For this reason a scalar observation used by this likelihood must include an explicit unit.

## Candidate contract

The estimator keeps the existing single-parameter finite-candidate boundary:

```text
one declared parameterId
finite unique candidate values
optional minimum / maximum constraints
```

Each constraint-eligible candidate is inserted as a supplied parameter value, then resolved and model-validated through the existing external-model pipeline.

The result distinguishes:

```text
constraint-excluded candidates
parameter/model-invalid candidates
prediction-non-converged candidates
prediction failures
scored candidates
```

Only candidates with converged finite predictions receive a Gaussian likelihood score.

## Solver convergence

Scalar likelihood does not convert a non-converged forward approximation into evidence.

If a requested expected-time or reward-axis predictor does not converge under the configured solver options, that candidate is rejected from scoring.

The request may supply the ordinary solver diagnostic options:

```text
maxIterations
tolerance
```

Their existing defaults and meanings are unchanged.

## Ranking

Scored candidates are ranked by total Gaussian log-likelihood density.

For convenience the result also reports:

```text
relativeLikelihoodToBest
= exp(logL(candidate) - logL(best))
```

This quantity is a likelihood ratio relative to the best supplied candidate.

It is not a posterior probability.

The result explicitly keeps:

```text
priorUsed: false
posteriorComputed: false
```

If multiple candidates have the same best log-likelihood within the current numeric tie tolerance, all best values are returned and `estimatedValue` remains `null`.

## Observation coverage

This estimator consumes scalar observations only.

It does not silently ignore `state_count` or `transition_count` observations. A dataset supplied to this method that contains count observations is rejected by the scalar-likelihood contract.

Likewise, every scalar observation in the dataset must have one explicit likelihood binding. Unbound scalar observations are rejected rather than ignored.

The existing transition-count estimator remains separate:

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

A later composite method may combine statistically independent transition-count and scalar likelihood terms, but this implementation does not silently multiply unlike evidence models.

## Example

The representative example is:

```text
packages/core/examples/scalar_gaussian_estimation.ts
```

It models four items whose total-cost reward axis is:

```text
4 * unitCost
```

and compares finite `unitCost` candidates against an observed total cost with an explicitly supplied Gaussian standard deviation in JPY.

The observation value is therefore not copied directly into `unitCost`; the model-side formula transforms the candidate into the predicted observable before likelihood evaluation.

## Unsupported in this layer

This layer does not implement:

- continuous optimization;
- multiple unknown parameters;
- automatic variance estimation;
- correlated Gaussian errors;
- non-Gaussian scalar likelihoods;
- automatic unit conversion;
- legacy reward scalar prediction without unit metadata;
- reward-rate scalar prediction without an explicit reward unit;
- Bayesian prior or posterior;
- credible/confidence intervals;
- hidden-state inference.

Those require separate explicit contracts rather than reinterpretation of this method.
