# Reverse result handoff

## Purpose

The reverse estimators expose detailed method-specific result types. This handoff layer adds one stable third-party summary boundary without redefining any likelihood, search method, posterior, confidence interval, or causal attribution.

Input:

```text
ExternalReverseMethodResult
```

Output:

```text
ReverseResultHandoff
```

Public helpers:

```text
toReverseResultHandoff
reverseResultHandoffToJson
formatReverseResultHandoffPlainText
```

The handoff schema version is currently `1`.

## Supported reverse methods

The handoff accepts results from all checked reverse methods currently exposed by the generic dispatcher:

```text
discrete_parameter_candidates
scalar_gaussian_parameter_candidates
composite_parameter_candidates
multi_parameter_transition_grid
```

It does not execute estimation itself. Estimation is performed first through the existing checked boundary, for example:

```text
external unknown / JSON
→ estimateExternalReverseInput / estimateExternalReverseJson
→ ExternalReverseMethodResult
→ toReverseResultHandoff
→ structured handoff
```

## Success structure

Every success handoff contains:

```text
schemaVersion
kind
status
estimationKind
methods
selection
ranking
evidence
constraints
assumptions
priorUsed
posteriorComputed
warnings
limitations
```

Multi-parameter grid results additionally expose:

```text
searchLimits.rawCombinationCount
searchLimits.eligibleCombinationCount
searchLimits.maxCombinations
```

### Methods

The handoff preserves the existing method names rather than replacing them with a generic label.

Examples:

```text
likelihoodMethod:
  conditional_transition_log_likelihood_without_multinomial_constant

likelihoodMethod:
  conditionally_independent_gaussian_scalar_log_likelihood

compositeMethod:
  transition_plus_scalar_gaussian_composite_log_likelihood

searchMethod:
  finite_cartesian_parameter_grid
```

Composite summaries also preserve the transition and scalar component method names separately.

### Selection

Single-parameter results expose:

```text
parameterId
estimatedValue
bestCandidateValues
status
```

where `status` is one of:

```text
unique_best_candidate
tied_best_candidates
no_best_candidate
```

Multi-parameter grid results preserve the estimator's finite-grid contract:

```text
parameterIds
estimatedAssignment
bestAssignments
identifiability
```

The handoff does not convert a tie into an arbitrary estimate.

### Ranking

Ranking rows remain method-specific enough to preserve mathematical meaning.

Transition-count candidate rows keep:

```text
value
possible
logLikelihoodScore
relativeLikelihoodToBest
rank
```

Scalar Gaussian rows keep:

```text
value
logLikelihoodScore
relativeLikelihoodToBest
rank
diagnostics
```

Composite rows keep:

```text
value
possible
transitionLogLikelihoodScore
scalarGaussianLogLikelihoodScore
totalLogLikelihoodScore
relativeLikelihoodToBest
rank
scalarDiagnostics
```

Finite-grid rows keep:

```text
assignment
possible
logLikelihoodScore
relativeLikelihoodToBest
rank
```

Component scores are not collapsed into one unnamed score.

## Evidence and assumptions

The handoff copies the estimator's `usedObservationIds`.

Composite results additionally expose explicit evidence blocks:

```text
evidence.blocks.transition
evidence.blocks.scalar
```

Scalar Gaussian results preserve:

```text
scalar_observations_conditionally_independent_given_candidate
```

Composite results preserve:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

The handoff does not infer a new independence assumption.

## Constraints and search limits

Single-parameter request constraints are copied as supplied.

Multi-parameter grid constraints are preserved per parameter dimension. The summary also copies raw/eligible combination counts and the mandatory `maxCombinations` limit.

The handoff does not deduplicate candidate values, clip constraints, truncate grids, sample assignments, or otherwise repair requests.

## Convergence diagnostics

Scalar Gaussian ranking rows preserve existing solver diagnostics. Composite ranking rows preserve their scalar component diagnostics.

A non-converged scalar prediction is rejected before it can become a successful likelihood row; the handoff does not turn a rejected prediction into evidence.

## Prior and posterior

Every current successful reverse estimator explicitly returns:

```text
priorUsed: false
posteriorComputed: false
```

The handoff preserves those fields exactly.

`relativeLikelihoodToBest` remains a likelihood ratio. It is not renamed or interpreted as posterior probability.

## Warnings

Warnings are derived only from already-observable result state:

```text
estimate_not_unique
no_possible_candidate_or_assignment
some_candidates_or_assignments_rejected
some_candidates_excluded_by_constraints
```

They do not change the result.

## Limitations

The handoff makes current boundaries explicit through machine-readable limitation codes:

```text
finite_candidate_space_only
relative_likelihood_is_not_posterior_probability
no_confidence_or_credible_interval_computed
no_causal_attribution_computed
transition_multinomial_constant_omitted
scalar_units_require_exact_match_no_conversion
finite_grid_identifiability_only
```

Only method-relevant limitations are added beyond the common finite-candidate / non-posterior / no-interval / no-causal-attribution boundaries.

### Transition multinomial constant

Transition-count scores use the established conditional transition likelihood with the candidate-independent multinomial constant omitted.

The handoff therefore states that boundary rather than pretending the score is an absolute fully normalized data likelihood. Ranking and likelihood ratios remain comparable for the same transition evidence because the omitted constant cancels between candidates.

### Finite-grid identifiability

Multi-parameter `identifiability` describes only the supplied finite candidate grid.

It is not converted into a claim of global structural identifiability over a continuous parameter space.

## Failure structure

Failures remain failures. The handoff exposes:

```text
status: failure
stage
estimationKind? 
estimationStage?
issues
```

`stage` remains one of:

```text
json_syntax
shape
estimation
```

For parse/shape failure there is no fabricated estimation kind, estimate, ranking, prior/posterior statement, or confidence statement.

For estimator failure, the checked dispatcher-provided `estimationKind`, estimator stage, and mapped issues are preserved.

## Plain text

`formatReverseResultHandoffPlainText` provides a concise human-readable handoff containing method/search, selected estimate, used observations, prior/posterior status, warnings, and limitation codes.

It is a convenience view of the structured handoff, not an independent statistical renderer.

## Non-goals

This module does not add:

- Bayesian priors or posteriors;
- confidence or credible intervals;
- continuous optimization;
- hidden-state inference;
- automatic unit conversion;
- multi-parameter causal attribution;
- a complete TeX renderer;
- a GUI or web API.
