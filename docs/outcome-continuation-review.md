# 成果還元関数 continuation review

## Purpose

This document chooses the next implementation by missing analytical capability, mathematical clarity, third-party usability, and compatibility rather than PR count.

## Current position

The repository has a coherent Kiyotan-style **forward v1 candidate** and a deliberately bounded Seikatan-style reverse layer.

The authoritative implementation boundary is:

```text
docs/forward-v1-support-matrix.md
```

Forward remains integrated through checked input, parameter/formula resolution, validation, expected reward/time/reachability, reward rate, contribution, named axes, diagnostics, scenario comparison, and one-at-a-time sensitivity.

## Reverse likelihood and search contracts

Current reverse contracts are deliberately separate.

### Transition-count likelihood

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

For observed transition counts `k` and candidate probability `p`:

```text
score = sum k * log(p)
```

The omitted multinomial coefficient is candidate-independent for the same observations.

### Scalar Gaussian likelihood

```text
conditionally_independent_gaussian_scalar_log_likelihood
```

Each scalar observation is explicitly bound to a unit-bearing predictor. Current predictors are:

```text
expected_elapsed_time_seconds
reward_axis_expected_value(axisId)
```

The Gaussian standard deviation is explicit, finite, and positive. Observation, predictor, and error-model units must match exactly. Non-converged model-side predictions are not used as likelihood evidence.

### Composite transition + scalar likelihood

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

The composite method reuses the existing transition and scalar estimators. It requires a complete evidence partition and the explicit assumption:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

Only then is:

```text
totalScore = transitionScore + scalarGaussianScore
```

used. The transition multinomial constant remains omitted, so total score is defined up to that candidate-independent constant.

### Finite multi-parameter transition grid

```text
finite_cartesian_parameter_grid
```

Two or more unknown parameter dimensions are exhaustively searched over finite eligible candidate sets. `maxCombinations` is mandatory. No silent truncation, sampling, or adaptive search is substituted.

The grid reuses the established transition-count likelihood and reports finite-grid identifiability through unique best, tied best, or no possible assignment.

## Checked external reverse input

The previous third-party reverse-input gap is now closed for every current reverse API family.

The generic checked dispatcher supports:

```text
discrete_parameter_candidates
scalar_gaussian_parameter_candidates
composite_parameter_candidates
multi_parameter_transition_grid
```

Public entry points are:

```text
parseExternalReverseEstimationDocument
parseExternalReverseEstimationJson
estimateExternalReverseInput
estimateExternalReverseJson
```

The established discrete-specific checked entry points remain supported.

The generic boundary reuses the existing checked model and ObservationDataset parsers and keeps:

```text
json_syntax
shape
estimation
```

separate.

It deliberately does not:

- deduplicate candidates;
- infer predictors from metric strings;
- invent Gaussian sigma or epsilon;
- convert units;
- clip constraints;
- truncate or sample multi-parameter grids;
- infer composite independence assumptions;
- copy observations into model parameters.

Estimator-semantic violations therefore remain visible as estimator failures instead of being repaired by the parser.

The contract is documented in:

```text
docs/reverse-external-methods.md
```

## Prior / posterior boundary

All current reverse likelihood/search paths remain non-Bayesian:

```text
priorUsed: false
posteriorComputed: false
```

`relativeLikelihoodToBest` is a likelihood ratio, not a posterior probability.

Bayesian work must not begin by renaming existing fields. It must define explicit prior mass/density, combine it with likelihood, normalize evidence, and return a separately named posterior result.

## What remains unsupported

The reverse layer still does not implement:

- continuous or adaptive optimization;
- multi-parameter composite likelihood;
- automatic variance estimation;
- correlated scalar errors;
- general non-Gaussian scalar likelihoods;
- Bayesian prior/posterior inference;
- MCMC or variational inference;
- hidden-state inference;
- confidence/credible intervals;
- automatic unit conversion;
- multi-parameter causal attribution.

## Highest-value next candidates

### 1. Multi-parameter composite finite grid — conditional candidate

This should be implemented only if a representative generic use case genuinely requires both:

```text
multiple unknown parameters
and
transition + scalar evidence
```

If justified, it should reuse `estimateCompositeParameterCandidates` as the per-assignment scorer, mirror the explicit Cartesian size controls of `estimateMultiParameterGrid`, and preserve component scores, evidence partition, finite-grid ties, and the declared between-block independence assumption.

It must not become causal attribution.

### 2. Reverse result/report handoff

Before adding more statistical families, assess whether third-party use now needs a concise versioned summary/report boundary for the current reverse results. Existing TeX/report helpers are still forward/legacy partial surfaces rather than a unified reverse renderer.

Any such work should summarize existing statistical semantics without inventing confidence levels or posterior language.

### 3. Bayesian prior / posterior

Still lower priority.

Proceed only if a concrete use case supplies meaningful prior information. Then explicitly implement:

```text
prior × likelihood -> evidence normalization -> posterior
```

with separate prior, likelihood, evidence, and posterior types.

## Forward boundaries remain unchanged

Forward v1 continues to preserve expected reward/reachability/time distinctions, ratio-of-expectations reward rate, explicit solver non-convergence, `candidate - baseline` scenario semantics, one-at-a-time conditional sensitivity, independent named reward axes, and descriptive rather than causal contribution differences.

## Current non-goals

Do not move the core toward these without a generic reason:

- digipachi-specific functionality;
- Juoh-specific functionality;
- large Bayesian frameworks;
- GUI implementation;
- monetization implementation;
- undefined causal attribution.

## Small-test boundary

New tests should mainly protect production behavior, mathematical/statistical semantics, compatibility boundaries, and meaningful failure cases. Near-duplicate formatting/copy tests are not the project objective.

## Handoff reading order

```text
README.md
docs/forward-v1-support-matrix.md
docs/observations.md
docs/discrete-estimation.md
docs/scalar-gaussian-estimation.md
docs/composite-likelihood-estimation.md
docs/multi-parameter-grid-estimation.md
docs/reverse-external-input.md
docs/reverse-external-methods.md
docs/outcome-continuation-review.md
```

## Suggested assistant prompt

```text
Treat Kiyotan as the forward-v1 candidate defined by docs/forward-v1-support-matrix.md.
Treat transition likelihood, scalar Gaussian likelihood, single-parameter composite likelihood, and finite multi-parameter transition grid as separate explicit Seikatan contracts.
Treat parseExternalReverseEstimationDocument / Json and estimateExternalReverseInput / Json as the checked third-party boundary for every current reverse method.
Keep observation, predictor, evidence block, candidate/assignment, likelihood, score, estimate, prior, posterior, and causal attribution distinct.
Do not infer sigma, units, independence assumptions, priors, grid truncation, or attribution methods.
Only add multi-parameter composite likelihood if a generic use case demonstrates that both multiple unknowns and mixed evidence are required simultaneously.
Keep Bayesian semantics and large domain specialization out of scope until justified.
```

## Current interpretation

The project has crossed seven meaningful boundaries:

1. the forward engine is an integrated v1 candidate;
2. transition counts support explicit finite likelihood estimation;
3. scalar observations support explicit Gaussian likelihood;
4. transition and scalar evidence can be explicitly composed for one unknown parameter;
5. transition likelihood supports exhaustive finite multi-parameter search with a hard limit;
6. reverse parsing keeps statistical semantics distinct from JSON/shape validation;
7. every currently implemented reverse method/search family is reachable through a checked external JSON/unknown boundary.

The next work should be justified by a demonstrated analytical or handoff gap, not by roadmap momentum alone.
