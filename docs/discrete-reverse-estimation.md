# Discrete reverse estimation

## Purpose

This is the first minimal Seikatan-style reverse-estimation production boundary.

It does **not** implement a general Bayesian inference engine. It ranks a finite set of candidate values for exactly one declared parameter using an explicit likelihood derived from observed transition counts.

The concepts remain separate:

```text
parameter definition
unknown parameter
candidate value / candidate set
fixed supplied parameters
ObservationDataset
constraint
likelihood
estimate over the candidate set
```

No observation is copied directly into a parameter value and called an estimate.

## Public entry point

```text
estimateDiscreteParameterFromTransitions
```

The request contains:

```ts
{
  document: ExternalModelDocument;
  observations: ObservationDataset;
  unknownParameter: ParameterId;
  candidateValues: number[];
  constraint?: {
    type: 'range';
    min?: number;
    max?: number;
  };
}
```

The selected unknown parameter must be declared by the model and must not also appear in the document's fixed `parameterValues`.

Other required parameters may continue to come from fixed supplied values or model defaults.

## Likelihood model

The current likelihood kind is:

```text
transition_multinomial_complete_categories
```

For each observed origin state, transition-count observations define category counts:

```text
n_1, n_2, ..., n_k
```

and the candidate-resolved model defines outgoing destination probabilities:

```text
p_1(theta), p_2(theta), ..., p_k(theta)
```

where `theta` is the candidate value of the selected unknown parameter.

The per-state multinomial log-likelihood is:

```text
log L_s(theta)
= log(N_s!)
- sum_j log(n_sj!)
+ sum_j n_sj log(p_sj(theta))
```

with:

```text
N_s = sum_j n_sj
```

The total log-likelihood is the sum across independently scored observed origin-state groups:

```text
log L(theta) = sum_s log L_s(theta)
```

The estimate is the maximum-likelihood value **only among the supplied discrete candidates**.

It is therefore reported as:

```text
maximum_likelihood_over_discrete_candidates
```

It must not be described as continuous optimization.

## Complete-category requirement

For every origin state that has any `transition_count` observation, the dataset must include an explicit transition-count record for every outgoing destination represented by the model.

A zero observation count must be written explicitly when the category exists but was not observed.

This prevents an omitted category from being silently interpreted as zero.

If the model contains multiple transition edges from the same origin to the same destination, their candidate probabilities are aggregated because the existing observation record identifies transitions by the `from -> to` pair rather than by an edge ID.

## Observation types

The current likelihood **uses only `transition_count` observations**.

Other ObservationDataset records remain valid evidence records but are ignored by this scorer and are returned through `ignoredObservationIds`:

- `state_count`
- `scalar`

This is intentional.

`state_count` currently means a count associated with a state and does not yet promise that every count is an outgoing-transition exposure count. The estimator therefore does not silently reinterpret it as a multinomial denominator.

Generic scalar observations likewise have no declared observation model connecting a metric to a candidate parameter.

A later estimator may consume those record types only after defining the corresponding observation model explicitly.

## Zero-probability events

If a candidate assigns probability zero to a category with positive observed count, that candidate has zero likelihood.

The mathematical log-likelihood is negative infinity, but JSON does not preserve infinity values reliably.

The API therefore represents this as:

```text
zeroLikelihood: true
logLikelihood: null
relativeLikelihoodToBest: 0
```

No arbitrary smoothing or epsilon probability is inserted.

## Candidate constraints

The initial constraint contract is an inclusive numeric range:

```text
min <= candidate <= max
```

Candidates outside the range are returned as rejected candidates rather than being silently clipped.

The constraint is a candidate-admissibility rule. It is not a prior distribution.

## Candidate resolution and model validation

Each admissible candidate is inserted as the value of the selected parameter and then passed through the existing external-model preparation path:

```text
candidate parameter value
+ fixed supplied parameters
→ parameter/formula resolution
→ structured model validation
→ evaluated transition probabilities
→ likelihood
```

A candidate that produces an invalid resolved model, for example probabilities outside the accepted model constraints, is rejected for that candidate while other candidates may still be scored.

## Result semantics

A successful result includes:

```text
estimateKind
likelihoodKind
unknownParameter
candidate counts
usedObservationIds
ignoredObservationIds
bestCandidateValues
estimatedValue
maximumLogLikelihood
allScoredCandidatesZeroLikelihood
candidate details
```

For each scored candidate:

```text
candidateValue
zeroLikelihood
logLikelihood
relativeLikelihoodToBest
per-state likelihood terms
```

`relativeLikelihoodToBest` is:

```text
exp(log L(candidate) - max log L)
```

for candidates with non-zero likelihood.

It is a relative likelihood ratio to the best supplied candidate. It is **not** a posterior probability and the values are not normalized to sum to one.

If several candidates have equal maximum log-likelihood within the fixed numerical tie tolerance, all are listed in `bestCandidateValues` and `estimatedValue` is `null` rather than selecting an arbitrary winner.

If every scored candidate has zero likelihood, there is no finite maximum-likelihood estimate; `maximumLogLikelihood` and `estimatedValue` remain `null`.

## No prior / posterior

This implementation has:

```text
likelihood: yes
prior: no
posterior: no
Bayesian update: no
```

A later Bayesian layer may combine an explicit prior with the likelihood, but it must use separate types and terminology.

## Current limitations

This first reverse boundary intentionally does not implement:

- continuous parameter optimization;
- simultaneous estimation of multiple unknown parameters;
- Bayesian priors or posterior distributions;
- scalar-observation likelihoods;
- state-count exposure likelihoods;
- hidden-state inference;
- observation error / misclassification models;
- arbitrary smoothing for zero-probability events;
- confidence intervals or asymptotic uncertainty estimates;
- automatic candidate generation.

These are later capabilities, not implicit behavior of the current API.

## Representative example

```text
packages/core/examples/discrete_reverse_estimation.ts
```

The example observes 61 successful and 39 failed transitions, then compares the finite candidate set:

```text
0.4, 0.5, 0.6, 0.7
```

for a parameter controlling success probability.

The result should be interpreted as "which supplied candidate gives the largest transition-count likelihood under this model?", not as a direct frequency copy or a posterior probability.
