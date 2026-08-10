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
multi_parameter_composite_grid
```

It does not execute estimation itself. Estimation is performed first through the checked boundary:

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

Finite multi-parameter results additionally expose:

```text
searchLimits.rawCombinationCount
searchLimits.eligibleCombinationCount
searchLimits.maxCombinations
```

### Methods

The handoff preserves existing method names rather than replacing them with a generic label.

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

Single- and multi-parameter composite summaries also preserve transition and scalar component method names separately.

### Selection

Single-parameter results expose:

```text
parameterId
estimatedValue
bestCandidateValues
status
```

where `status` is:

```text
unique_best_candidate
tied_best_candidates
no_best_candidate
```

Multi-parameter results expose:

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

Single-parameter composite rows keep:

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

Multi-parameter transition-grid rows keep:

```text
assignment
possible
logLikelihoodScore
relativeLikelihoodToBest
rank
```

Multi-parameter composite-grid rows keep:

```text
assignment
possible
transitionLogLikelihoodScore
scalarGaussianLogLikelihoodScore
totalLogLikelihoodScore
relativeLikelihoodToBest
rank
scalarDiagnostics
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

Both single- and multi-parameter composite results preserve:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

The handoff does not infer a new independence assumption.

## Constraints and search limits

Single-parameter request constraints are copied as supplied.

Multi-parameter constraints are preserved per parameter dimension. Finite-grid summaries copy raw/eligible combination counts and mandatory `maxCombinations`.

The handoff does not deduplicate candidate values, clip constraints, truncate grids, sample assignments, or repair requests.

## Convergence diagnostics

Scalar Gaussian candidate rows preserve existing solver diagnostics.

Single-parameter composite candidate rows preserve scalar component diagnostics.

Multi-parameter composite assignment rows preserve the same scalar component diagnostics for each evaluated assignment.

A non-converged scalar prediction is rejected before it becomes a successful likelihood row; the handoff does not turn a rejected prediction into evidence.

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

The handoff states that boundary rather than presenting the score as an absolute fully normalized data likelihood. Ranking and likelihood ratios remain comparable for the same transition evidence because the omitted constant cancels between candidates or assignments.

### Scalar units

Scalar and composite methods preserve the exact-unit contract:

```text
observation unit == predictor unit == Gaussian error-model unit
```

No unit conversion is inferred by the handoff.

### Finite-grid identifiability

Multi-parameter `identifiability` describes only the supplied finite candidate grid.

It is not converted into a claim of global structural identifiability over a continuous parameter space.

It is also not a parameter-level causal attribution.

## Multi-parameter composite handoff

For `multi_parameter_composite_grid`, the handoff exposes all four relevant method layers together:

```text
searchMethod = finite_cartesian_parameter_grid
compositeMethod = transition_plus_scalar_gaussian_composite_log_likelihood
transitionMethod = conditional_transition_log_likelihood_without_multinomial_constant
scalarMethod = conditionally_independent_gaussian_scalar_log_likelihood
```

It also keeps:

```text
estimatedAssignment / bestAssignments / identifiability
transition/scalar/all usedObservationIds
transition/scalar evidence blocks
explicit between-block independence assumption
raw / eligible / max combination counts
transition / scalar / total assignment scores
scalar solver diagnostics
priorUsed: false
posteriorComputed: false
```

This is a summary of the existing typed estimator result. No likelihood is recalculated in the handoff layer.

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

`formatReverseResultHandoffPlainText` provides a concise human-readable handoff containing method/search, selected estimate or assignment, used observations, prior/posterior status, warnings, and limitation codes.

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
