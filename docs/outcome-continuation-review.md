# 成果還元関数 continuation review

## Purpose

This document is the review surface for choosing the next implementation by missing analytical capability, mathematical clarity, third-party usability, and compatibility rather than by PR count.

## Current position

The repository now has a coherent Kiyotan-style **forward v1 candidate** and a small Seikatan-style reverse path.

The authoritative forward support boundary is:

```text
docs/forward-v1-support-matrix.md
```

The main forward path is:

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

## Minimal Seikatan boundary

The first reverse estimator remains deliberately small:

```text
one parameterized model
+ one declared unknown parameter
+ finite candidate values
+ optional candidate constraints
+ ObservationDataset state/transition counts
→ candidate resolution / model validation
→ conditional transition log-likelihood score
→ likelihood ratio relative to best candidate
→ ranking
→ unique estimate or explicit tie
```

The typed estimator is:

```text
estimateDiscreteParameterCandidates
```

Its statistical contract is documented in:

```text
docs/discrete-estimation.md
```

## Checked external reverse input

The reverse path now also has a versioned `unknown` / JSON boundary:

```text
external JSON / unknown
→ reverse envelope shape check
→ nested ExternalModelDocument shape check
→ nested ObservationDataset shape check
→ typed discrete estimation request
→ existing estimator semantics
→ structured result
```

The public entry points are:

```text
parseExternalDiscreteEstimationDocument
parseExternalDiscreteEstimationJson
estimateExternalDiscreteParameterInput
estimateExternalDiscreteParameterJson
```

and the envelope is documented in:

```text
docs/reverse-external-input.md
```

This keeps JSON syntax, primitive/discriminant shape problems, and statistical/estimation failures separate.

The parser does not deduplicate candidates, clip constraints, infer counts, or reinterpret observations. Semantically invalid but structurally typed requests remain the estimator's responsibility.

## Statistical meaning

The current method is explicitly named:

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

For observed transition counts `k` and candidate transition probability `p`, it uses:

```text
sum k * log(p)
```

The omitted multinomial coefficient is constant across candidates for the same observations, so the score preserves candidate likelihood ranking.

The implementation returns:

```text
relativeLikelihoodToBest = exp(score(candidate) - score(best))
```

This is a likelihood ratio, not a posterior probability.

The result states:

```text
priorUsed: false
posteriorComputed: false
```

## Observation boundary

Observations remain distinct from model definitions, supplied parameter values, evaluated values, forward results, and estimates.

The current transition likelihood method consumes `state_count` and `transition_count` together under a method-specific departure-count contract. For each likelihood source state, transition counts must sum to the associated state count.

`scalar` remains a valid ObservationDataset record but is explicitly unsupported by this likelihood method. It is not copied into a parameter or silently ignored as evidence.

## Candidate / constraint boundary

The result separates:

```text
constraint-excluded candidates
model-invalid candidates
model-valid but observation-impossible candidates
scored candidates
```

A positive observed transition count with candidate probability zero makes that candidate impossible.

A tie reports all best candidates and leaves `estimatedValue` null rather than choosing arbitrarily.

## What remains unsupported

The current reverse layer is not:

- continuous optimization;
- unrestricted maximum-likelihood estimation;
- multi-parameter estimation;
- a scalar-observation likelihood system;
- a prior model;
- a Bayesian posterior calculator;
- MCMC or variational inference;
- hidden-state inference;
- uncertainty interval estimation.

The external reverse envelope does not change these limitations.

## Forward mathematical boundaries

Forward v1 continues to preserve these distinctions:

- expected reward is not reachability probability;
- expected elapsed time is separate from reward;
- reward rate is `E[reward] / E[time]`, not `E[reward / time]`;
- solver non-convergence remains explicit;
- scenario difference is `candidate - baseline`;
- one-at-a-time sensitivity is a conditional counterfactual, not a global sensitivity index;
- contribution-row differences are descriptive, not unique causal attribution;
- named reward axes are not implicitly netted;
- TeX/report remain partial rather than complete forward-v1 renderers.

## Highest-value next candidates

The third-party input gap of the first reverse PoC is now closed. Further reverse work should add a statistical capability only when its observation model is explicit.

Recommended next candidates:

1. an explicit likelihood/score contract for a selected scalar observation, including unit expectations and a declared error/distribution model;
2. a finite multi-parameter candidate grid only if a generic example genuinely needs more than one unknown at once, with candidate-space growth and identifiability documented;
3. optional prior weights and a separately named posterior result only when a use case requires Bayesian semantics;
4. multi-parameter outcome attribution only after a defined ordered-marginal, Shapley-style, or other interaction rule is selected;
5. richer transition effects only when a representative generic model proves `set_property` insufficient;
6. solver/internal cleanup as lower-priority maintenance.

Do not choose the next item merely because it is easy to implement.

## Current non-goals

Do not move the core toward these without a specific generic justification:

- digipachi-specific functionality;
- Juoh-specific functionality;
- large Bayesian frameworks;
- GUI implementation;
- monetization implementation;
- broad diffusion claims.

## Small-test boundary

Historical JSON/copy/text/report micro-tests remain regression coverage, not the project objective.

New tests should mainly protect production behavior, statistical/mathematical semantics, compatibility boundaries, and meaningful failure cases.

## Continuation criteria

Continue implementation when work materially improves at least one of:

1. analytical capability,
2. mathematical interpretation,
3. third-party usability,
4. forward/reverse separation,
5. reproducibility without private context,
6. handoff clarity.

## Handoff reading order

A new contributor should read:

```text
README.md
docs/forward-v1-support-matrix.md
docs/forward-evaluation.md
docs/scenario-comparison.md
docs/parameter-sensitivity.md
docs/observations.md
docs/discrete-estimation.md
docs/reverse-external-input.md
docs/outcome-continuation-review.md
```

## Suggested assistant prompt

```text
Treat the current Kiyotan forward path as the forward-v1 candidate defined by docs/forward-v1-support-matrix.md.
Treat estimateDiscreteParameterCandidates as the minimal typed Seikatan contract and estimateExternalDiscreteParameterInput / Json as its checked third-party input boundary.
Do not return to near-duplicate boundary-test work.
Choose the next production change only when it adds a mathematically declared observation/likelihood capability or closes another demonstrated analytical gap.
Do not call likelihood ratios posterior probabilities, do not infer priors that are not supplied, and do not copy observations directly into parameters and call that estimation.
Keep large domain specialization, GUI, monetization, and large Bayesian inference out of scope unless a later instruction explicitly changes the phase.
```

## Current interpretation

The project has crossed three useful boundaries:

1. the forward engine is integrated enough to be treated as a forward v1 candidate;
2. reverse estimation has a small explicit discrete likelihood contract;
3. both forward and the first reverse path now have checked third-party input boundaries.

The next phase should deepen analytical capability only where the observation model and statistical interpretation can be stated as explicitly as the current transition likelihood.
