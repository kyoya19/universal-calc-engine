# Finite multi-parameter grid estimation

## Purpose

This layer extends the minimal Seikatan transition-count estimator from one unknown parameter to several explicitly declared unknown parameters without changing the likelihood formula and without introducing Bayesian semantics.

The search is finite and exhaustive over a caller-declared Cartesian product.

## Search method

The search method is:

```text
finite_cartesian_parameter_grid
```

The likelihood method remains the existing:

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

For every generated parameter assignment, the implementation reuses the existing single-parameter transition-count estimator as the score source. It does not maintain a second implementation of `sum k * log(p)`.

## Request

A grid request contains:

```text
parameters[]
  parameterId
  finite candidate values
  optional min/max constraints
maxCombinations
```

At least two distinct declared parameter IDs are required.

Candidate values must be finite and unique within each parameter dimension.

## Cartesian product

For candidate sets:

```text
A = {a1, a2, ...}
B = {b1, b2, ...}
...
```

the eligible search space is the full Cartesian product:

```text
A x B x ...
```

No combination is silently sampled, truncated, randomized, or skipped merely to reduce runtime.

Per-parameter min/max constraints are applied before expansion. The result reports both the raw combination count and the eligible combination count, together with excluded candidate values by parameter.

## Hard combination limit

`maxCombinations` is mandatory and must be a positive safe integer.

The eligible Cartesian product is counted before assignments are materialized. If:

```text
eligibleCombinationCount > maxCombinations
```

the request fails with `candidate_grid_limit_exceeded`.

There is no hidden library default and no automatic sampling fallback.

If the raw or eligible product cannot be represented as a JavaScript safe integer, the request fails rather than rounding the count.

## Assignment evaluation

Each assignment is merged into the model's supplied parameter values and evaluated through the existing parameter-resolution/model-validation path.

The transition likelihood is then obtained through the existing single-parameter estimator using one parameter dimension as an internal scoring anchor. The anchor is not a statistical special case; all parameter values in the assignment are already supplied to the candidate model.

This reuse preserves the established observation contract:

```text
state_count + matching transition_count departures
sum transition counts == state count
```

Scalar observations are not absorbed into this transition-count method. They remain handled by the separately named scalar Gaussian likelihood family.

## Assignment result

Each evaluated assignment records:

```text
assignment
possible
logLikelihoodScore
relativeLikelihoodToBest
rank
```

Model-invalid assignments are kept separately as rejected assignments rather than being converted into low likelihood scores.

Assignments that are model-valid but assign zero probability to positively observed transitions remain statistically impossible in the same way as the single-parameter estimator.

## Ranking and identifiability

Possible assignments are ranked by the same transition log-likelihood score used by the existing estimator.

The best-set contract is explicit:

```text
unique_best_assignment
tied_best_assignments
no_possible_assignment
```

If exactly one assignment has the best score, it is returned as `estimatedAssignment`.

If multiple assignments tie for the best score within the current numeric tie tolerance, all are returned in `bestAssignments` and `estimatedAssignment` remains `null`.

A tie is therefore surfaced as non-identifiability over the supplied finite grid instead of being resolved arbitrarily.

This does not prove global structural identifiability outside the supplied candidate grid.

## Likelihood versus posterior

The result keeps:

```text
priorUsed: false
posteriorComputed: false
```

and reports a likelihood ratio relative to the best assignment:

```text
exp(logL(assignment) - logL(best))
```

This is not a posterior probability.

## Not causal attribution

A multi-parameter assignment search estimates which parameter combinations best explain the declared observations under the declared likelihood.

It does not decompose a forward scenario difference into causal contributions.

No Shapley, ordered marginal, interaction-allocation, or other attribution method is implied.

## Example

See:

```text
packages/core/examples/multi_parameter_grid_estimation.ts
```

The example has two unknown component parameters whose average determines the transition success probability. The transition observations rank the full candidate grid.

A second observation set can make two different assignments produce the same best predicted probability; the API reports the resulting tie rather than selecting one assignment.

## Current limitations

This layer does not implement:

- continuous optimization;
- adaptive search;
- random/grid sampling;
- assignment-wide cross-parameter constraints;
- priors or posterior probabilities;
- uncertainty intervals;
- hidden-state inference;
- multi-parameter scalar Gaussian composition;
- causal attribution.

Those require separate named contracts.
