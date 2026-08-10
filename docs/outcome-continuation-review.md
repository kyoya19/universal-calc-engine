# 成果還元関数 continuation review

## Purpose

This document is the review surface for deciding what should be implemented next without depending on private conversation history or PR count.

The project should be evaluated by missing analytical capability, mathematical clarity, third-party usability, and compatibility.

## Current position

The Kiyotan-style forward side is now a coherent **forward v1 candidate**.

Its implementation-backed support and handoff boundary is documented in:

```text
docs/forward-v1-support-matrix.md
```

The main forward path is:

```text
checked external input
→ parameter / formula resolution
→ structured validation
→ expansion / evaluation
→ expected reward
→ expected elapsed time
→ optional reachability
→ ratio-of-expectations reward rate
→ contribution output
→ optional named reward axes
→ convergence diagnostics
→ structured result
```

Higher analytical layers include:

```text
same model + baseline/candidate parameters
→ structured scenario comparison
```

and:

```text
same model + baseline + one selected parameter + candidate values
→ one-at-a-time sensitivity
```

## Minimal Seikatan boundary

The repository now has a first reverse-estimation production contract.

It deliberately stays small:

```text
one parameterized model
+ one declared unknown parameter
+ finite candidate values
+ optional candidate constraints
+ ObservationDataset transition counts
→ candidate model resolution / validation
→ conditional transition log-likelihood score
→ likelihood ratio relative to best candidate
→ ranking
→ unique estimate or explicit tie
```

This layer is implemented by:

```text
estimateDiscreteParameterCandidates
```

and documented in:

```text
docs/discrete-estimation.md
```

## Statistical meaning

The current method is explicitly named:

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

For observed transition counts `k` and candidate transition probability `p`, it uses:

```text
sum k * log(p)
```

The omitted multinomial coefficient is constant across candidates for the same observations, so the score is suitable for candidate ranking.

The implementation returns:

```text
relativeLikelihoodToBest = exp(score(candidate) - score(best))
```

This is a likelihood ratio relative to the best candidate.

It is **not** a posterior probability.

The result explicitly states:

```text
priorUsed: false
posteriorComputed: false
```

No Bayesian prior has been introduced.

## Observation boundary

Observations remain distinct from:

- model definitions
- supplied parameter values
- evaluated model values
- solver results
- estimates

The first likelihood method consumes only `state_count` and `transition_count` observations.

For each likelihood source state it requires transition counts to sum to the associated state count, so the observed departures are explicit.

`scalar` observations remain valid ObservationDataset records, but this likelihood method rejects them as unsupported evidence instead of silently copying or ignoring them.

## Candidate / constraint boundary

Candidate values are explicit finite numbers.

Simple minimum/maximum constraints can exclude candidates before model evaluation.

The result separates:

```text
constraint-excluded candidates
model-invalid candidates
model-valid but observation-impossible candidates
scored candidates
```

A candidate that assigns zero probability to a positively observed transition is marked impossible.

If multiple candidates tie for best score, all are reported and `estimatedValue` remains `null` rather than choosing one arbitrarily.

## What remains unsupported

The current reverse layer is not:

- continuous optimization
- unrestricted maximum-likelihood estimation
- multi-parameter estimation
- a scalar-observation likelihood system
- a prior model
- a Bayesian posterior calculator
- MCMC
- variational inference
- hidden-state inference
- uncertainty interval estimation

These must not be implied by the existence of the discrete candidate scorer.

## Forward mathematical boundaries

Forward v1 continues to preserve these distinctions:

- expected reward is not reachability probability
- expected elapsed time is separate from reward
- reward rate is `E[reward] / E[time]`, not `E[reward / time]`
- solver non-convergence remains explicit
- scenario difference is `candidate - baseline`
- one-at-a-time sensitivity is a conditional counterfactual, not a global sensitivity index
- contribution-row differences are descriptive, not unique causal attribution
- named reward axes are not implicitly netted
- TeX/report remain partial rather than complete forward-v1 renderers

## Highest-value next candidates

After the first discrete reverse contract is stable, the next production work should be selected by demonstrated analytical value.

Recommended order:

1. finite multi-parameter candidate grid **only if** a generic example needs more than one unknown at once;
2. an explicit likelihood/score method for selected scalar observations, with units and statistical meaning stated;
3. optional prior weights and a separately named posterior result only when a use case requires Bayesian semantics;
4. reverse-estimation external JSON/request boundary if third-party reverse input becomes a practical blocker;
5. multi-parameter attribution only after an explicit ordered-marginal, Shapley-style, or other method is chosen;
6. richer transition effects only when a representative generic model proves `set_property` insufficient;
7. solver/internal cleanup as lower-priority maintenance.

Do not choose the next item merely because it is easy to implement.

## Current non-goals

Do not move the core toward these without a specific generic justification:

- digipachi-specific functionality
- Juoh-specific functionality
- large Bayesian frameworks
- GUI implementation
- monetization implementation
- broad diffusion claims

Domain-specific examples may be introduced later to test genericity after the relevant generic capability exists.

## Small-test boundary

Historical JSON/copy/text/report micro-tests remain regression coverage, but they are not the project objective.

New tests should mainly protect:

- production behavior
- statistical/mathematical semantics
- compatibility boundaries
- meaningful failure cases

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
docs/outcome-continuation-review.md
```

## Suggested assistant prompt

```text
Treat the current Kiyotan forward path as the forward-v1 candidate defined by docs/forward-v1-support-matrix.md.
Treat estimateDiscreteParameterCandidates as the first minimal Seikatan contract: one unknown parameter, finite candidates, explicit transition-count log-likelihood ranking, no prior, no posterior.
Do not return to near-duplicate boundary-test work.
Choose the next production change only when it closes a demonstrated analytical gap while preserving parameter/observation/candidate/likelihood/estimate distinctions.
Do not imply Bayesian posterior semantics, multi-parameter causal attribution, large domain specialization, GUI, or monetization without an explicit scope decision.
```

## Current interpretation

The project has crossed two boundaries:

1. the forward engine is integrated enough to be treated as a forward v1 candidate;
2. reverse estimation is no longer only a roadmap idea because a small explicit discrete likelihood contract now exists.

The next phase should deepen reverse capability only where statistical meaning remains explicit and a representative generic use case justifies the extension.
