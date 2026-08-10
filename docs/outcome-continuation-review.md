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

The established transition method is:

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

For observed transition counts `k` and candidate probability `p`:

```text
score = sum k * log(p)
```

The same observations are used across candidates, so the omitted multinomial coefficient does not affect ranking.

`relativeLikelihoodToBest` is a likelihood ratio. The result explicitly keeps:

```text
priorUsed: false
posteriorComputed: false
```

## Reverse capability 2: scalar Gaussian likelihood

The scalar method is:

```text
conditionally_independent_gaussian_scalar_log_likelihood
```

Each scalar `observationId` must be explicitly bound to one unit-bearing model-side predictor:

```text
expected_elapsed_time_seconds
reward_axis_expected_value(axisId)
```

For observation `y`, candidate prediction `mu`, and caller-supplied `sigma > 0`:

```text
log L = -log(sigma * sqrt(2*pi)) - 0.5 * ((y - mu) / sigma)^2
```

Multiple scalar observations are added only under the declared conditional-independence assumption. Observation unit, predictor unit, and error-model unit must match exactly. No sigma, epsilon, unit conversion, prior, or posterior is inferred.

## Reverse capability 3: finite multi-parameter transition grid

The search method is:

```text
finite_cartesian_parameter_grid
```

It accepts two or more distinct declared unknown parameter dimensions, each with a finite candidate set and optional per-parameter min/max constraints.

The grid layer does **not** define another transition likelihood formula. Every complete parameter assignment is supplied to the model and scored by the existing single-parameter transition-count estimator, preserving the established `sum k * log(p)` implementation and observation contract.

The request must include:

```text
maxCombinations
```

The implementation computes raw and constraint-eligible Cartesian product sizes before materializing the eligible grid. It rejects an oversized grid instead of truncating, sampling, randomizing, or silently switching algorithms.

Result semantics include:

```text
assignment
logLikelihoodScore
relativeLikelihoodToBest
rank
bestAssignments
estimatedAssignment
identifiability
```

Identifiability over the supplied finite grid is reported as:

```text
unique_best_assignment
tied_best_assignments
no_possible_assignment
```

A tie leaves `estimatedAssignment` null. This is finite-grid non-identifiability, not a claim about the full continuous parameter space.

Multi-parameter estimation is also not causal attribution. No Shapley, ordered-marginal, or interaction-allocation method is implied.

The contract is documented in:

```text
docs/multi-parameter-grid-estimation.md
```

## Reverse input boundary

The existing checked reverse external JSON envelope currently targets the single-parameter transition-count estimator.

The newer scalar Gaussian and multi-parameter grid APIs are typed public APIs, but do not yet have equivalent external envelopes.

This is now a practical third-party usability gap rather than a statistical gap.

## What remains unsupported

The reverse layer still does not implement:

- continuous or adaptive parameter optimization;
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

### 1. Explicit composite likelihood

This is the strongest analytical next candidate if a generic model needs transition counts and scalar measurements at the same time.

It must not simply concatenate scores because both evidence families already contain method-specific assumptions.

A valid composite contract would have to state, at minimum:

```text
which transition observations are consumed
which scalar observations are consumed
conditional independence between the evidence blocks given a candidate assignment
log-likelihood aggregation rule
unit/error-model requirements for scalar terms
what happens when one component is impossible or non-converged
whether the method supports single-parameter candidates, multi-parameter assignments, or both
```

Only after those are explicit should the two likelihood families be summed.

### 2. Checked external input for newer reverse methods

A lower-risk usability step is to extend the reverse external input boundary with explicit discriminated envelopes for:

```text
scalar Gaussian estimation
multi-parameter transition grid
```

The parser should reuse existing model/ObservationDataset parsers and preserve the distinction between shape failure and estimator semantics. It must not normalize candidate sets, infer sigma, infer predictors, or silently clip the grid.

### 3. Bayesian prior / posterior

Still lower priority.

It should be introduced only with a concrete source of meaningful prior mass or density. The implementation must genuinely calculate and normalize:

```text
prior × likelihood → posterior
```

and define prior and posterior as separate types. Existing likelihood ratios must not be relabeled.

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
docs/multi-parameter-grid-estimation.md
docs/outcome-continuation-review.md
```

## Suggested assistant prompt

```text
Treat Kiyotan as the forward-v1 candidate in docs/forward-v1-support-matrix.md.
Treat transition-count likelihood, scalar Gaussian likelihood, and finite multi-parameter transition grid as separate explicit Seikatan contracts.
Keep observation, predictor, candidate/assignment, likelihood, score, estimate, prior, posterior, and causal attribution distinct.
Do not infer sigma, units, priors, grid truncation, or attribution methods.
Prefer either an explicit composite-likelihood contract or checked external envelopes for the newer reverse APIs as the next production step, based on demonstrated value.
Keep Bayesian semantics and large domain specialization out of scope until justified.
```

## Current interpretation

The project has now crossed five meaningful boundaries:

1. the forward engine is an integrated v1 candidate;
2. transition counts support explicit finite likelihood estimation;
3. single-parameter transition estimation has checked third-party JSON input;
4. scalar observations support an explicit Gaussian likelihood with predictor/unit/sigma/convergence semantics;
5. transition likelihood supports exhaustive finite multi-parameter assignments with hard search-size limits and explicit finite-grid identifiability.

The next work should improve evidence composition or external usability before increasing statistical complexity merely for breadth.
