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

## Reverse capability 1: transition-count likelihood

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

For observed transition counts `k` and candidate probability `p`:

```text
score = sum k * log(p)
```

The omitted multinomial coefficient is common to all candidates for the same transition observations and therefore does not affect ranking or likelihood ratios.

## Reverse capability 2: scalar Gaussian likelihood

```text
conditionally_independent_gaussian_scalar_log_likelihood
```

Every scalar observation is explicitly bound to a unit-bearing predictor. Current predictors are:

```text
expected_elapsed_time_seconds
reward_axis_expected_value(axisId)
```

For observation `y`, candidate prediction `mu`, and explicit `sigma > 0`:

```text
log L = -log(sigma * sqrt(2*pi)) - 0.5 * ((y - mu) / sigma)^2
```

Observation unit, predictor unit, and error-model unit must match exactly. No sigma, epsilon, unit conversion, prior, or posterior is inferred. Non-converged predictions are rejected as evidence.

## Reverse capability 3: explicit composite likelihood

The repository now supports a single-parameter composite method:

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

This method does not duplicate either component probability formula. It calls the existing transition-count estimator and scalar Gaussian estimator on explicitly partitioned subsets of one ObservationDataset.

The request must declare:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

This means the caller asserts that, conditional on a candidate parameter value, the transition-count evidence block and scalar evidence block can be multiplied as likelihood components.

The accepted dataset must be completely partitioned:

```text
transitionObservationIds
scalarLikelihoods[].observationId
```

Every observation is assigned to exactly one block. Unknown, overlapping, type-mismatched, duplicate, or unassigned evidence is rejected rather than silently ignored.

Under the declared assumption:

```text
totalScore
= transitionLogLikelihoodScore
+ scalarGaussianLogLikelihoodScore
```

The transition component still omits its candidate-independent multinomial constant, so the total is a candidate-ranking log-likelihood score up to that constant. Relative likelihood ratios remain valid because the constant cancels.

Component behavior stays visible:

- transition zero-probability impossible events make the composite candidate impossible;
- scalar predictor non-convergence rejects that candidate;
- component-level scores and diagnostics remain available;
- used observation IDs are reported separately for transition, scalar, and combined evidence.

The contract is documented in:

```text
docs/composite-likelihood-estimation.md
```

## Reverse capability 4: finite multi-parameter transition grid

```text
finite_cartesian_parameter_grid
```

Two or more distinct declared parameter dimensions can be searched exhaustively over finite candidate sets. Per-parameter constraints are applied before Cartesian expansion and `maxCombinations` is mandatory.

The grid does not define another likelihood. Every assignment is scored through the established transition-count estimator.

Result identifiability is limited to the supplied finite grid:

```text
unique_best_assignment
tied_best_assignments
no_possible_assignment
```

A tie leaves `estimatedAssignment` null. This is not a global structural-identifiability proof and not causal attribution.

## Reverse input boundary

The checked reverse external JSON envelope currently targets only the single-parameter transition-count estimator.

The following production APIs are still typed-only:

```text
estimateScalarGaussianParameterCandidates
estimateCompositeParameterCandidates
estimateMultiParameterGrid
```

This is now the most concrete third-party usability gap.

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

### 1. Checked external input for typed-only reverse methods

This is now the strongest next step.

The external boundary should use discriminated, versioned request envelopes for at least:

```text
scalar Gaussian estimation
composite transition + scalar estimation
multi-parameter transition grid
```

It should reuse the existing model and ObservationDataset parsers and keep these stages separate:

```text
JSON syntax
shape
model document parsing
observation parsing
request shape
estimator semantics
```

The parser must not:

- deduplicate candidates;
- infer predictor from metric names;
- invent sigma;
- convert units;
- truncate or sample a grid;
- auto-clip constraints;
- infer the composite independence assumption.

### 2. Multi-parameter composite grid

This becomes analytically meaningful only if a generic example requires both multiple unknown parameters and both evidence families at once.

If implemented, it should reuse the current single-parameter composite scorer in the same way the transition grid reuses the single-parameter transition scorer. Candidate-space limits and finite-grid ties must remain explicit.

### 3. Bayesian prior / posterior

Still lower priority.

It should be introduced only with a concrete source of meaningful prior mass or density. The implementation must genuinely calculate and normalize:

```text
prior × likelihood → posterior
```

Existing `relativeLikelihoodToBest` values must not be renamed or reinterpreted as posterior probabilities.

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

New tests should mainly protect production behavior, statistical/mathematical semantics, compatibility boundaries, and meaningful failure cases. Near-duplicate formatting/copy tests are not the project objective.

## Handoff reading order

```text
README.md
docs/forward-v1-support-matrix.md
docs/observations.md
docs/discrete-estimation.md
docs/reverse-external-input.md
docs/scalar-gaussian-estimation.md
docs/composite-likelihood-estimation.md
docs/multi-parameter-grid-estimation.md
docs/outcome-continuation-review.md
```

## Suggested assistant prompt

```text
Treat Kiyotan as the forward-v1 candidate in docs/forward-v1-support-matrix.md.
Treat transition-count likelihood, scalar Gaussian likelihood, explicit single-parameter composite likelihood, and finite multi-parameter transition grid as separate Seikatan contracts.
Keep observation, predictor, evidence block, candidate/assignment, likelihood, score, estimate, prior, posterior, and causal attribution distinct.
Do not infer sigma, units, independence assumptions, priors, grid truncation, or attribution methods.
Prefer checked external envelopes for the typed-only reverse APIs next unless a generic use case proves multi-parameter composite evidence is the larger blocker.
Keep Bayesian semantics and large domain specialization out of scope until justified.
```

## Current interpretation

The project has now crossed six meaningful boundaries:

1. the forward engine is an integrated v1 candidate;
2. transition counts support explicit finite likelihood estimation;
3. single-parameter transition estimation has checked third-party JSON input;
4. scalar observations support explicit Gaussian likelihood with predictor/unit/sigma/convergence semantics;
5. transition likelihood supports exhaustive finite multi-parameter assignments with hard search-size limits and finite-grid identifiability;
6. transition and scalar evidence can be composed for one unknown parameter only when evidence partition and between-block conditional independence are explicit.

The next work should close reverse third-party input gaps before increasing statistical complexity merely for breadth.
