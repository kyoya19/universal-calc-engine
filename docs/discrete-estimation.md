# Minimal discrete reverse estimation

## Purpose

This is the first Seikatan-style reverse-estimation contract in the repository.

It does not implement a general Bayesian engine. It estimates one declared model parameter over an explicit finite candidate set by comparing how well each candidate explains observed transition counts.

The implementation keeps these concepts separate:

```text
parameter
candidate
constraint
observation
likelihood score
estimate
prior
posterior
```

No observation is copied directly into a model parameter and called an estimate.

## Public API

```text
estimateDiscreteParameterCandidates
discreteParameterEstimationResultToJson
```

The request is:

```ts
{
  parameterId: string;
  candidates: number[];
  constraints?: Array<
    | { type: 'minimum'; value: number; inclusive?: boolean }
    | { type: 'maximum'; value: number; inclusive?: boolean }
  >;
}
```

The model is an existing checked `ExternalModelDocument` and the evidence is an existing `ObservationDataset`.

## Current statistical method

The current method is named:

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

For each source state used by the observation dataset, the estimator requires:

- one `state_count` observation giving the number of observed departures/exposures from that state
- one or more `transition_count` observations from that state
- the transition counts to sum exactly to that state count

For candidate parameter value `theta`, the model is resolved and evaluated. If the candidate gives transition probability `p(s -> t | theta)` and the observed transition count is `k(s -> t)`, the score is:

```text
sum over observed source/destination pairs:
  k(s -> t) * log(p(s -> t | theta))
```

The multinomial coefficient is omitted because it is constant across candidates for the same observed counts. Therefore the returned value is a candidate-ranking log-likelihood score, not a separately normalized probability of the candidate itself.

## Relative likelihood

For possible candidates, the estimator also returns:

```text
relativeLikelihoodToBest = exp(score(candidate) - score(best))
```

The best candidate therefore has relative likelihood `1`.

This is a likelihood ratio relative to the best candidate. It is not a posterior probability.

## Prior and posterior

The current result explicitly reports:

```text
priorUsed: false
posteriorComputed: false
```

No prior distribution is applied.

No Bayesian posterior is computed.

A future Bayesian layer may combine a prior with likelihood, but that must be a separate explicit contract.

## Candidate constraints

`minimum` and `maximum` constraints filter candidate values before model evaluation.

Constraint-excluded values are returned separately as `excludedCandidates`.

Candidates that pass constraints but cannot produce a valid resolved model are returned separately as `rejectedCandidates`. For example, a probability parameter candidate may make a transition probability fall outside the valid range.

## Impossible candidates

A model-valid candidate may still assign zero probability to a transition that was observed with positive count.

That candidate is reported as:

```text
possible: false
logLikelihoodScore: null
relativeLikelihoodToBest: 0
rank: null
```

This avoids serializing `-Infinity` through JSON, where it would otherwise become ambiguous.

## Ties

If multiple candidate values have the same best log-likelihood score within the current numerical tie tolerance, all are returned in:

```text
bestCandidateValues
```

and:

```text
estimatedValue
```

is `null` rather than choosing one arbitrarily.

## Observation contract

The estimator first reuses `validateObservationDataset` against a resolved candidate model.

It then applies method-specific likelihood requirements:

- exactly one `state_count` per source state used for likelihood
- matching `transition_count` observations
- transition counts sum exactly to the state count
- at least one usable state-count group

The current minimal likelihood method does **not** consume `scalar` observations. A scalar observation causes an explicit method-contract failure instead of being silently ignored or converted into a parameter.

Later reverse methods may define separate likelihoods or scores for scalar metrics.

## Multiple transitions with the same source and destination

Candidate probabilities are aggregated by explicit `(from, to)` pair before the observed transition count is scored.

This matches the current `transition_count` observation shape, which identifies an explicit source/destination pair rather than a unique transition ID.

## Base and named reward-axis models

The estimator works with both external model kinds:

```text
base
reward_axes
```

The current likelihood uses transition probabilities only. Reward values, elapsed time, and named reward axes do not alter this transition-count likelihood unless they affect the parameterized transition probabilities indirectly through the model definition.

## What this is not

This implementation is not:

- a continuous optimizer
- maximum-likelihood estimation over an unbounded real interval
- a Bayesian posterior calculator
- a prior-selection system
- MCMC
- variational inference
- a general hidden-state estimator
- a scalar-observation regression system
- a multi-parameter optimizer

It is a small, explicit discrete candidate likelihood layer built on the existing parameterized model and ObservationDataset boundaries.

## Representative example

```text
packages/core/examples/discrete_estimation.ts
```

The example observes 60 successes and 40 failures from 100 attempts and ranks a finite set of candidate success probabilities.

## Next reverse candidates

After this contract is stable, sensible extensions include:

1. multiple unknown parameters via an explicit finite candidate grid
2. additional observation likelihood methods for scalar metrics
3. optional prior weights with a separately named posterior result
4. constraints beyond simple range bounds where a concrete model requires them
5. uncertainty summaries only after the statistical meaning is explicitly defined

A large Bayesian framework should not be introduced merely because the word "reverse estimation" appears in the roadmap.
