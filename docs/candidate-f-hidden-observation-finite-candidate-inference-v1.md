# Candidate F — Hidden-observation finite-candidate inference v1

Authority: `ORF-ABC-HIDDEN-OBSERVATION-FINITE-CANDIDATE-INFERENCE-FOUNDATION-v1`

## Purpose

Candidate F adds a Seikatan-facing finite-candidate inference layer above Candidate C. A caller supplies a finite set of fixed hidden-state candidates and one realized finite observation sequence. Each candidate is evaluated under the existing Candidate C known-observation-kernel likelihood semantics. Candidate F then compares finite log likelihoods, preserves the complete maximum-likelihood tie set, and exposes caller-supplied scalar candidate values for downstream existing Kiyotan composition.

This is not Bayesian model selection and does not claim that a selected candidate is the globally correct model.

## Request

Each candidate supplies:

- unique non-empty `candidateId`
- fixed finite `DefinitionModel`
- finite initial state distribution
- finite observation alphabet
- known state-conditioned observation kernel
- optional JSON-scalar `value`

The request supplies one shared non-empty `observations` sequence for all candidates.

Candidate-specific initial-distribution, kernel, terminal and step-0 emission semantics are those already qualified by Candidate C.

## Likelihood and ranking

For candidate `c_i`:

`L_i = P(y_0,...,y_T | c_i)`

and

`ell_i = log L_i`.

Possible candidates are ranked by `ell_i`, not by direct float64 `sequenceProbability`. This is important because a mathematically possible long sequence can have a finite log likelihood while `exp(ell_i)` underflows float64.

If `ell*` is the greatest possible-candidate log likelihood, every candidate satisfying

`abs(ell_i - ell*) <= comparisonTolerance`

is retained in the maximum-likelihood set.

Input order never breaks a tie.

## Result classifications

- `unique_maximum_likelihood`: exactly one candidate is within comparison tolerance of the best finite log likelihood.
- `tied_maximum_likelihood`: two or more candidates are within comparison tolerance of the best finite log likelihood.
- `all_candidates_impossible`: every candidate assigns mathematical probability zero to the realized sequence.

`all_candidates_impossible` is an analytically successful classification, not request failure. It has no selected candidate and no fabricated winner.

## Probability underflow

Candidate C already distinguishes mathematical impossibility from representational underflow. Candidate F preserves that distinction per candidate.

A possible candidate whose direct sequence probability underflows has:

- `possible: true`
- finite `logLikelihood`
- `sequenceProbability: null`
- `sequenceProbabilityUnderflowed: true`

Such a candidate remains fully eligible for maximum-likelihood ranking.

## Ambiguity and non-claims

Candidate F deliberately preserves ambiguity. It does not:

- invent a tie-break rule
- use candidate input order as evidence
- normalize likelihoods into posterior probabilities
- accept Bayesian priors
- report `P(candidate | observations)`
- claim global structural identifiability
- claim the supplied candidate family contains the true model
- infer hidden-state cardinality
- learn unknown transition parameters outside the supplied finite family
- learn an unknown observation kernel

A unique maximum-likelihood candidate is unique only inside the supplied finite family, observation sequence and disclosed numerical comparison contract.

## Kiyotan bridge

The optional scalar `value` is preserved in each evaluation and selected-candidate record. This allows a caller to pass an inferred finite parameter value or candidate identifier into already-qualified Kiyotan composition paths without Candidate F changing reward, elapsed-time, reachability, contribution, sensitivity, scenario-comparison or decision semantics.

Candidate F itself does not execute a domain-specific objective.

## Failure semantics

Explicit request failures include:

- invalid probability/comparison/resource options
- empty candidate family
- duplicate or empty candidate ID
- candidate count above `maxCandidates`
- invalid non-finite or non-scalar candidate value
- empty/invalid observation sequence
- candidate-specific Candidate C validation/evaluation failure
- non-finite analytical ranking result

A mathematically impossible observation sequence under one or all otherwise-valid candidates is not request failure.

## Diagnostics

Successful results state that:

- method is finite-candidate hidden-observation log-likelihood comparison
- numeric representation is JavaScript float64
- simulation is not used
- ranking basis is finite log likelihood
- no candidate prior is used
- posterior normalization is not applied
- candidate posterior probability is not computed
- global model identification is not claimed
- candidate input order does not affect selection semantics

## Independent qualification

The targeted test suite uses expected values built independently of the production Candidate C call:

1. complete enumeration of all hidden-state paths for each small candidate, directly multiplying initial, transition and emission probabilities;
2. independently constructed dense transition matrices with separate forward probability propagation;
3. independent winner/tie classification from the resulting candidate likelihoods.

Metamorphic coverage includes candidate-order invariance, split-parallel-transition equivalence, exact-likelihood duplicate/tie behavior and probability-underflow ranking.

## Preserved boundaries

Candidate A state-distribution, Candidate B first-passage, Candidate C fixed-model filtering, Candidate D finite-family distinguishability, historical Seikatan estimators and existing Kiyotan composition remain unchanged.

This targeted capability does not authorize a new Wave, Level, principal application, Showcase, `ORF-30-CROSS-DOMAIN`, `ORF-40-TSUMOLOGY`, or release of `QUALIFIED_SCOPE_HOLD`.
