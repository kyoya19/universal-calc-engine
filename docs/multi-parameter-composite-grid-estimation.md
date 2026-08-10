# Finite multi-parameter composite grid estimation

## Purpose

This module estimates two or more declared unknown parameters over a finite Cartesian candidate grid while using both transition-count evidence and scalar Gaussian evidence.

It exists for cases where a single unknown parameter is insufficient.

A representative generic case has:

```text
p = unknown transition success probability
q = unknown value / quality produced by success
```

Transition counts provide direct evidence about `p`. A scalar observation such as expected quality can depend on both parameters, for example approximately `p * q`. When both `p` and `q` are unknown, single-parameter composite estimation cannot jointly rank their assignments without fixing one externally.

The multi-parameter composite grid therefore searches finite assignments while reusing the existing single-parameter composite likelihood implementation.

## Search method and likelihood methods remain separate

Search method:

```text
finite_cartesian_parameter_grid
```

Composite likelihood method:

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

Component methods remain:

```text
conditional_transition_log_likelihood_without_multinomial_constant
conditionally_independent_gaussian_scalar_log_likelihood
```

The grid layer does not define a fourth likelihood formula.

## Scorer reuse

For each complete eligible parameter assignment, the implementation:

1. injects the full assignment into `ExternalModelDocument.parameterValues`;
2. chooses one declared grid parameter as an anchor;
3. calls the existing `estimateCompositeParameterCandidates` with the anchor value as a one-value candidate set;
4. copies the resulting transition/scalar/total component scores into the assignment result;
5. ranks assignments by the existing composite total score.

Because the complete assignment is already supplied to the model, the anchor candidate does not introduce another free degree of freedom. It provides the existing single-parameter composite estimator with the request shape it already requires.

This preserves one implementation of:

```text
transition likelihood
scalar Gaussian likelihood
composite evidence partition
between-block conditional independence
zero-probability impossible events
scalar prediction convergence
```

## Request

```text
MultiParameterCompositeGridEstimationRequest
```

contains:

```text
parameters
maxCombinations
transitionObservationIds
scalarLikelihoods
independenceAssumption
solver?
```

Each parameter dimension contains:

```text
parameterId
candidates
constraints?
```

At least two distinct declared parameters are required.

Candidate values must be finite and duplicate-free. Constraints remain explicit minimum/maximum constraints.

## Evidence partition and independence

The request uses the same composite evidence contract as the existing single-parameter estimator.

Transition evidence is selected by:

```text
transitionObservationIds
```

Scalar evidence is selected by:

```text
scalarLikelihoods[].observationId
```

Every observation must be assigned to exactly one component by the existing composite scorer. Unknown, overlapping, type-mismatched, duplicate, or unassigned evidence is rejected.

The caller must explicitly declare:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

For a complete parameter assignment `theta`, this permits composition of the two existing evidence blocks as:

```text
log score(theta)
= transition log score(theta)
+ scalar Gaussian log score(theta)
```

The grid layer does not infer this assumption.

## Scalar predictor contract

The scalar component retains the existing explicit bindings.

Current supported predictor forms are:

```text
expected_elapsed_time_seconds
reward_axis_expected_value(axisId)
```

The observation unit, predictor unit, and Gaussian error-model unit must match exactly.

Gaussian `standardDeviation` must be explicit, finite, and positive.

No unit conversion, sigma estimation, default sigma, or epsilon smoothing is introduced by the grid layer.

## Cartesian search size

The implementation reports:

```text
rawCombinationCount
eligibleCombinationCount
maxCombinations
```

`rawCombinationCount` is the Cartesian product before constraints.

Constraints are applied independently per parameter dimension before the eligible Cartesian product is materialized.

`eligibleCombinationCount` is the product after those exclusions.

`maxCombinations` is mandatory. If the eligible grid is larger than the explicit limit, estimation fails before assignment materialization.

The implementation does not silently:

- truncate the grid;
- sample assignments;
- randomize search;
- switch to continuous optimization;
- deduplicate caller candidates;
- clip candidates to constraints.

## Assignment result

Each evaluated assignment keeps:

```text
assignment
possible
transitionLogLikelihoodScore
scalarGaussianLogLikelihoodScore
totalLogLikelihoodScore
relativeLikelihoodToBest
rank
transitionStateScores
scalarObservationScores
scalarDiagnostics
```

Component scores remain separate.

The total score is present only when the transition component is possible.

## Transition impossible events

If a candidate assignment gives probability zero to a transition with positive observed count, the existing transition component marks that candidate impossible.

The multi-parameter composite result preserves:

```text
possible: false
transitionLogLikelihoodScore: null
totalLogLikelihoodScore: null
rank: null
```

A finite scalar Gaussian score cannot rescue that assignment.

## Scalar non-convergence

Scalar predictors use the existing diagnostic solvers.

When a model-side scalar prediction fails to converge, that assignment is rejected rather than ranked using a last approximation.

Assignment-specific candidate-evaluation failures are collected in:

```text
rejectedAssignments
```

Global evidence-contract or request failures stop the whole estimation instead of being misrepresented as one bad assignment.

## Ranking

Only assignments with:

```text
possible: true
totalLogLikelihoodScore != null
```

participate in ranking.

For best score `s_best` and assignment score `s_i`:

```text
relativeLikelihoodToBest = exp(s_i - s_best)
```

This remains a likelihood ratio. It is not a posterior probability.

## Identifiability

The result reports:

```text
unique_best_assignment
tied_best_assignments
no_possible_assignment
```

When more than one assignment ties for the best score, `estimatedAssignment` remains `null` and every best assignment is listed in `bestAssignments`.

This identifiability statement applies only to the supplied finite eligible grid.

It is not a proof of global structural identifiability over a continuous parameter space.

## Transition multinomial constant

The transition-count component omits the candidate-independent multinomial constant for the same transition evidence.

Therefore the composite total is a log-likelihood score up to that constant:

```text
total composite score
= transition score without common multinomial constant
+ normalized scalar Gaussian log likelihood
```

The omitted constant cancels when comparing assignments on the same evidence, so ranking and `relativeLikelihoodToBest` remain meaningful within this request.

## Priors and posterior

The result explicitly remains:

```text
priorUsed: false
posteriorComputed: false
```

No prior mass/density, evidence normalization, or posterior assignment probability is computed.

## Causal attribution boundary

A best multi-parameter assignment is an estimate on the supplied finite grid.

It is not a causal contribution decomposition among parameters.

The module does not define Shapley values, ordered marginal allocation, interaction decomposition, or another causal attribution method.

## API

Public entry point:

```text
estimateMultiParameterCompositeGrid
```

JSON helper:

```text
multiParameterCompositeGridEstimationResultToJson
```

This PR introduces the typed estimator first. Checked external JSON/unknown input and `ReverseResultHandoff` support for this new estimator should be added only after this typed contract passes CI and is stable.

## Non-goals

This module does not implement:

- continuous optimization;
- adaptive grid refinement;
- MCMC;
- variational inference;
- Bayesian prior/posterior;
- hidden-state inference;
- automatic unit conversion;
- automatic sigma estimation;
- confidence/credible intervals;
- causal attribution.
