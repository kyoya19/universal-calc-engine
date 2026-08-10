# 成果還元関数 continuation review

## Purpose

This document chooses the next implementation by missing analytical capability, mathematical clarity, third-party usability, and compatibility rather than PR count.

## Current position

The repository now has a coherent Kiyotan-style **forward v1 candidate** and a small Seikatan-style reverse layer.

The authoritative implementation boundary is:

```text
docs/forward-v1-support-matrix.md
```

The forward path remains:

```text
checked external model input
→ parameter / formula resolution
→ structured validation
→ expansion / evaluation
→ expected reward / elapsed time / optional reachability
→ ratio-of-expectations reward rate
→ contribution / optional named reward axes
→ convergence diagnostics
→ structured result
```

Higher forward analysis includes scenario comparison and one-at-a-time sensitivity.

## Reverse capability 1: transition-count likelihood

The first reverse method remains:

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

It estimates one declared parameter over a finite candidate set from explicit `state_count` plus `transition_count` departure observations.

For observed transition counts `k` and candidate transition probability `p`:

```text
score = sum k * log(p)
```

The multinomial coefficient common to the same observations is omitted for candidate ranking.

The method reports:

```text
relativeLikelihoodToBest
priorUsed: false
posteriorComputed: false
```

The likelihood ratio is not a posterior probability.

The current checked reverse JSON envelope feeds this transition-count estimator after model, observation, and request shape checking.

## Reverse capability 2: scalar Gaussian likelihood

Scalar observations are no longer merely parseable evidence. They now have a separate explicit reverse-estimation method:

```text
conditionally_independent_gaussian_scalar_log_likelihood
```

The method still estimates exactly one declared parameter over a finite candidate set.

It does not map a scalar observation metric string directly to a parameter or output. Every scalar `observationId` must be explicitly bound to one supported model-side predictor:

```text
expected_elapsed_time_seconds
reward_axis_expected_value(axisId)
```

These predictors were selected because their units are explicit. Legacy scalar reward and reward rate remain excluded from this scalar-likelihood contract because legacy reward has no explicit unit metadata.

For observation `y`, candidate prediction `mu`, and caller-supplied standard deviation `sigma > 0`:

```text
log L = -log(sigma * sqrt(2*pi)) - 0.5 * ((y - mu) / sigma)^2
```

Multiple scalar observations are combined only under the declared assumption:

```text
scalar_observations_conditionally_independent_given_candidate
```

The implementation requires exact agreement between:

```text
observation unit
predictor unit
Gaussian error-model unit
```

It does not invent sigma, replace zero variance with epsilon, infer units, or silently use non-converged forward predictions as evidence.

The implementation and mathematical contract are documented in:

```text
docs/scalar-gaussian-estimation.md
```

## Candidate boundary

Both current reverse families preserve the same high-level estimation philosophy:

```text
unknown parameter
candidate set
observation evidence
explicit likelihood method
candidate score
estimate / tie
```

They keep constraint-excluded, model-invalid, prediction-invalid/impossible, and scored candidates distinct where applicable.

A tie does not produce an arbitrary point estimate.

## What remains unsupported

The reverse layer still does not implement:

- continuous optimization;
- multi-parameter estimation;
- automatic variance estimation;
- correlated scalar errors;
- general non-Gaussian scalar likelihoods;
- Bayesian priors/posteriors;
- MCMC or variational inference;
- hidden-state inference;
- confidence/credible interval estimation;
- automatic unit conversion.

The existence of two likelihood families does not imply any of those features.

## Next-candidate comparison

### 1. Finite multi-parameter candidate grid

This is now the strongest next reverse candidate.

Why it is attractive:

- it preserves finite candidate likelihood semantics already used by the single-parameter estimators;
- it can expose non-identifiability as tied parameter assignments instead of hiding it;
- it does not require prior/posterior semantics;
- it can reuse the existing explicit transition-count likelihood first, then later compose other declared likelihood families.

Conditions before implementation:

```text
multiple declared unknown parameter IDs
one finite candidate set per parameter
Cartesian product size calculation
explicit maximum combination limit
no silent truncation or sampling
parameter-assignment result rather than scalar value result
explicit ties / non-identifiability
constraints defined per parameter or assignment
```

The implementation must not call a multi-parameter scenario difference a causal attribution.

### 2. Checked external input for scalar Gaussian estimation

The typed scalar estimator is useful now, but third-party JSON input for its predictor/error-model bindings is not yet part of the reverse external envelope.

This is a smaller usability gap than multi-parameter analytical capability, but it is a safe follow-up if external consumption becomes the immediate priority.

### 3. Bayesian prior / posterior

Still lower priority.

It should be introduced only when a concrete use case supplies meaningful prior mass or density. At that point the API must actually compute:

```text
prior × likelihood → normalized posterior
```

and must define prior and posterior as separate types. Existing `relativeLikelihoodToBest` must not be renamed or reinterpreted as posterior probability.

## Forward boundaries remain unchanged

Forward v1 continues to preserve:

- expected reward vs reachability probability;
- elapsed time vs reward;
- `E[reward] / E[time]` vs `E[reward / time]`;
- explicit solver non-convergence;
- scenario `candidate - baseline` semantics;
- one-at-a-time conditional sensitivity;
- descriptive contribution differences rather than unique causal attribution;
- independent named reward axes;
- partial TeX/report coverage.

## Current non-goals

Do not move the core toward these without a generic reason:

- digipachi-specific functionality;
- Juoh-specific functionality;
- large Bayesian frameworks;
- GUI implementation;
- monetization implementation;
- undefined multi-parameter causal attribution.

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
docs/outcome-continuation-review.md
```

## Suggested assistant prompt

```text
Treat the Kiyotan forward path as the forward-v1 candidate defined by docs/forward-v1-support-matrix.md.
Treat transition-count likelihood and scalar Gaussian likelihood as separate explicit minimal Seikatan methods over finite single-parameter candidate sets.
Keep observation, predictor, likelihood, prior, posterior, score, and estimate distinct.
Do not infer sigma, units, priors, or causal attribution.
Prefer finite multi-parameter candidate-grid work next only if candidate-space growth, assignment ties, constraints, and a hard combination limit are explicit.
Keep large domain specialization and large Bayesian inference out of scope until a generic need is demonstrated.
```

## Current interpretation

The project has crossed four meaningful boundaries:

1. the forward engine is integrated enough to be a forward v1 candidate;
2. transition-count observations support a finite explicit likelihood estimator;
3. reverse transition estimation has a checked external JSON boundary;
4. scalar observations now support a second explicit Gaussian likelihood family with declared predictor, unit, sigma, independence, and convergence semantics.

The next analytical step should broaden unknown-parameter dimensionality before adding Bayesian semantics, unless external scalar JSON ingestion becomes the more immediate practical blocker.
