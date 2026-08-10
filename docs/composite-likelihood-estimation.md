# Composite transition + scalar Gaussian likelihood

## Purpose

This layer lets one finite single-parameter candidate search use two already-existing evidence families at the same time:

1. transition-count likelihood;
2. scalar Gaussian likelihood.

It does **not** introduce a third probability model. It composes the existing component estimators only when the caller explicitly declares the required conditional-independence assumption.

## Public entry point

```text
estimateCompositeParameterCandidates
```

The method identifier is:

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

## Required independence declaration

The request must contain exactly:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

The intended statement is:

```text
P(transition evidence, scalar evidence | candidate)
=
P(transition evidence | candidate)
*
P(scalar evidence | candidate)
```

This is a modelling assumption supplied by the caller. The engine does not infer or test it from the data.

Within the scalar block, the existing scalar estimator additionally uses its own declared assumption:

```text
scalar_observations_conditionally_independent_given_candidate
```

Therefore a caller using multiple scalar observations must accept both levels of conditional-independence modelling.

## Evidence partition

Every ObservationDataset record must be assigned to exactly one evidence block.

Transition evidence IDs are listed explicitly in:

```text
transitionObservationIds
```

They must refer only to:

```text
state_count
transition_count
```

Scalar evidence is identified through the existing explicit `scalarLikelihoods` bindings. Each binding maps one scalar `observationId` to a predictor and Gaussian error model.

The composite layer rejects:

- unknown observation IDs;
- duplicate dataset IDs that make partitioning ambiguous;
- scalar observations placed in the transition block;
- count observations placed in the scalar block;
- an observation assigned to both blocks;
- any dataset observation assigned to neither block.

No evidence is silently ignored.

## Component 1: transition-count likelihood

The existing transition estimator remains the only implementation of:

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

For observed counts `k` and candidate transition probabilities `p`:

```text
score_transition = sum k * log(p)
```

A positive observed count on a transition to which the candidate assigns probability zero makes the transition component impossible for that candidate.

The omitted multinomial coefficient is candidate-independent for the same transition observations.

## Component 2: scalar Gaussian likelihood

The existing scalar estimator remains the implementation of:

```text
conditionally_independent_gaussian_scalar_log_likelihood
```

For each bound scalar observation:

```text
log L = -log(sigma * sqrt(2*pi))
        - 0.5 * ((observed - predicted) / sigma)^2
```

The composite layer does not change scalar rules:

- predictor is explicit;
- unit is explicit;
- Gaussian sigma is supplied explicitly and must be finite and positive;
- observation, predictor, and error-model units must match exactly;
- no unit conversion is performed;
- no default sigma or epsilon is invented;
- non-converged predictor results are rejected rather than used as likelihood evidence.

## Composite score

Under the declared evidence-block conditional independence:

```text
totalScore
=
transitionLogLikelihoodScore
+
scalarGaussianLogLikelihoodScore
```

Because the transition component omits only a candidate-independent multinomial constant, `totalScore` is a composite log-likelihood score **up to that candidate-independent constant**.

The result states this explicitly as:

```text
scoreInterpretation:
sum_of_component_log_likelihood_scores_up_to_transition_candidate_independent_constant
```

Candidate ranking and likelihood ratios are unaffected by that omitted constant.

## Candidate results

Each returned candidate exposes component-level evidence:

```text
transitionLogLikelihoodScore
scalarGaussianLogLikelihoodScore
totalLogLikelihoodScore
transitionStateScores
scalarObservationScores
scalarDiagnostics
relativeLikelihoodToBest
rank
```

If the transition component is impossible, the scalar component may still have a finite diagnostic score, but:

```text
possible = false
totalLogLikelihoodScore = null
rank = null
```

The scalar evidence is not allowed to rescue a candidate that assigns zero probability to a positively observed transition.

## Candidate rejection

Model-invalid or prediction-invalid candidates remain separate from statistically impossible transition candidates.

`rejectedCandidates` records which component rejected a value:

```text
transition
scalar_gaussian
```

A scalar solver non-convergence therefore remains visible as a scalar component rejection rather than being converted into an arbitrary score.

## Used observations

The result returns explicit evidence accounting:

```text
usedObservationIds.transition
usedObservationIds.scalar
usedObservationIds.all
```

Since unassigned observations are rejected, `all` represents the complete accepted dataset for this composite evaluation.

## Prior and posterior boundary

The composite method remains likelihood-only:

```text
priorUsed: false
posteriorComputed: false
```

`relativeLikelihoodToBest` remains a likelihood ratio. It is not a posterior probability and must not be normalized or labelled as one without a separate prior/posterior method.

## Current dimensionality boundary

This first composite API is single-parameter finite-candidate estimation.

The repository also has a separate finite multi-parameter transition-count grid search. A later multi-parameter composite search may reuse this composite scorer, but it should do so as an explicit extension rather than silently changing the existing grid likelihood.

## Example

See:

```text
packages/core/examples/composite_likelihood_estimation.ts
```

The example combines transition departure counts with a unit-explicit reward-axis scalar observation for the same candidate probability parameter.
