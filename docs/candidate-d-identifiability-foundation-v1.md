# Candidate D — Finite model-family identifiability foundation v1

## Status

Targeted generalized capability implementation under `ORF-ABC-IDENTIFIABILITY-FOUNDATION-v1`.

This capability classifies **finite model-family observational distinguishability under an explicit finite observation design**. It does not claim global structural identifiability.

## Contract

Input consists of:

- at least two candidate models with unique candidate IDs;
- at least one observation probe with a unique probe ID;
- an optional finite non-negative absolute comparison tolerance;
- optional Candidate A state-distribution options.

Candidate and probe input order do not affect semantic classification. Output is canonicalized by candidate ID and probe ID.

For candidate model `m` and probes `p_1 ... p_k`, the observable signature is

`σ(m) = (p_1(m), ..., p_k(m))`.

For two candidates `a` and `b`, with comparison tolerance `τ`, the pair is distinguished exactly when at least one declared probe satisfies

`|p_j(a) - p_j(b)| > τ`.

Otherwise the pair is reported as unresolved within tolerance under the declared observation design.

Because tolerance-based approximate equality is not generally transitive, the API does **not** manufacture equivalence classes. It reports unresolved peers pairwise.

A candidate is `uniquely_distinguishable_within_family` only when it is distinguished from every other supplied candidate. Otherwise it is `ambiguous_under_observation_design`.

Family classification is:

- `fully_distinguishable`: every pair is distinguished;
- `fully_unresolved_within_tolerance`: no pair is distinguished;
- `partially_distinguishable`: otherwise.

All classifications are relative to the supplied finite family, probes, and tolerance.

## Authorized probes

### `transition_probability`

Returns the evaluated aggregate one-step probability from the declared source state to the declared destination state. Parallel transitions are summed. A terminal source state uses implicit self-retention: self probability is 1 and every other destination is 0.

### `state_probability`

Returns the probability of the declared observed state at the declared finite horizon from the declared finite initial distribution. Evaluation delegates to Candidate A `propagateFiniteHorizonStateDistribution`, including its validation, finite-horizon limit, mass-conservation, and terminal semantics.

## Public API

- `classifyFiniteModelFamilyIdentifiability`
- `finiteModelFamilyIdentifiabilityResultToJson`
- `FiniteModelFamilyIdentifiabilityRequest`
- `FiniteModelFamilyIdentifiabilityResult`
- associated candidate, probe, signature, pairwise, classification, diagnostics, and failure types.

## Failure semantics

The API fails explicitly for:

- fewer than two candidates;
- missing, empty, or duplicate candidate IDs;
- candidate parameter-resolution/model-validation failure;
- empty probe set;
- missing, empty, or duplicate probe IDs;
- probe states unknown to any candidate;
- invalid Candidate A initial distribution or horizon;
- invalid comparison tolerance;
- invalid Candidate A state-distribution options;
- non-finite observable coordinates.

No normalization or silent repair is performed.

## Independent qualification oracles

Production code uses direct evaluated-transition aggregation and Candidate A propagation. Qualification uses analytically known transition fixtures, independent expected state-probability values on one-step fixtures, pairwise brute-force comparison, and metamorphic invariants:

- candidate-order permutation;
- probe-order permutation;
- split-transition aggregate equivalence;
- redundant/identical observable semantics;
- explicit tolerance non-transitivity case.

Simulation alone is not an oracle.

## Compatibility and non-claims

Existing likelihood estimators, finite-grid tie handling, Candidate A propagation, reward/time/reachability, contribution, and decision semantics are unchanged.

This capability does **not** provide:

- global structural-identifiability proofs;
- continuous-parameter identifiability;
- symbolic identifiability;
- automatic experiment optimization;
- latent-state, noisy, censored, posterior, or Bayesian inference;
- first-passage or stationary-distribution solving;
- cyclic policy optimization or arbitrary MDP optimization;
- causal or Shapley attribution.

A unique result within one supplied finite family must not be described as globally identifiable. An unresolved pair under one supplied finite observation design must not be described as globally non-identifiable.
