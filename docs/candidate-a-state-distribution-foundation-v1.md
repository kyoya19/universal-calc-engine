# Candidate A — Finite-Horizon State-Distribution Foundation v1

Authority: `ORF-ABC-STATE-DISTRIBUTION-FOUNDATION-v1`

This document defines the targeted Public production contract authorized for Candidate A. It does not release `QUALIFIED_SCOPE_HOLD` globally and does not authorize stationary distributions, first-passage distributions, latent-state inference, generalized identifiability, cyclic policy optimization, a new Wave, a new Level, a principal application, or a Showcase.

## Mathematical contract

Let the explicit finite state set be `S`, the initial probability distribution be `mu_0`, and the transition matrix induced by the validated `DefinitionModel` be `P` for non-terminal states.

For finite integer horizon `H >= 0`:

`mu_(t+1) = mu_t P`, for `t = 0, ..., H-1`.

Terminal states use implicit self-retention for this contract. Their outgoing transitions, if present, remain subject to the existing validation warning and are ignored by propagation, matching the current solver boundary.

The returned trajectory includes both endpoints:

`mu_0, mu_1, ..., mu_H`.

Expected visit count is defined inclusively:

`N_H(s) = sum_{t=0}^{H} P(X_t = s)`.

This is an expected visit count / cumulative state mass. It is not a first-passage distribution, absorption-time distribution, stationary distribution, reward distribution, contribution attribution, or latent-state posterior.

## API contract

Primary function:

`propagateFiniteHorizonStateDistribution(model, request, options?)`

Request:

- `initialDistribution`: sparse entry-list of `{ stateId, probability }`.
- Omitted states have initial probability zero.
- Duplicate state entries are invalid, including duplicate zero-probability entries.
- `horizon`: non-negative integer.

Options:

- `probabilityTolerance`: finite positive number; default `1e-9`.
- `maxHorizon`: non-negative integer resource boundary; default `10000`; callers may override it explicitly.

Success result:

- `trajectory`: dense state-id-sorted distributions for every step `0..H`.
- `finalDistribution`: the distribution at step `H`.
- `expectedVisitCounts`: dense state-id-sorted expected visit counts using the inclusive `0..H` convention.
- diagnostics state that simulation was not used, Float64 is the numeric representation, no normalization was applied, and terminal states use implicit self-retention.

Serialization:

`stateDistributionResultToJson(result)` rejects non-finite numeric values before JSON serialization.

## Normalization policy

No automatic normalization is performed.

An initial total inside the documented tolerance is accepted exactly as supplied. A total outside tolerance is an explicit failure. Stepwise mass loss or gain outside tolerance is an explicit failure. The implementation does not silently rescale distributions to convert a failing calculation into success.

## Deterministic ordering

Public distribution arrays are ordered by state identifier using deterministic string comparison, independent of `model.states` enumeration order. Production edges are also deterministically ordered before sparse propagation.

Equivalent mathematical transition encodings are compared by observable probability distributions within documented numerical tolerance; bitwise identity is not claimed for distinct floating-point encodings.

## Compatibility

`DefinitionModel.startState` remains unchanged and required by the existing model contract.

Candidate A does not reinterpret or replace existing expected reward, expected elapsed time, reachability, contribution, sensitivity, or forward-solver semantics.

A delta initial distribution at the existing start state,

`mu_0(startState)=1`, with all other initial masses zero,

is the compatibility special case. Targeted regression compares its propagated observable probability against existing forward reachability on a shared fixture while independently retaining the existing reward/time checks.

## Failure semantics

Expected failures are explicit result values. Covered classes include:

- invalid probability tolerance or resource option;
- invalid model under existing `DefinitionModel` validation;
- unknown initial state;
- duplicate initial state entry;
- negative, greater-than-one, or non-finite initial probability;
- initial probability total outside tolerance;
- negative or non-integer horizon;
- horizon beyond configured `maxHorizon`;
- stepwise probability-mass loss or gain beyond tolerance;
- negative propagated mass;
- non-finite analytical result.

Terminal-state self-retention, unreachable-state zero mass, zero-probability transitions, and recurrent finite-horizon propagation are success semantics, not special fallbacks.

## Independent oracle architecture

Production algorithm:

- sparse iterative probability-mass propagation over deterministic state/edge order.

Primary independent oracle:

- independently constructed dense transition matrix and row-vector multiplication.
- It does not call the production propagation routine or reuse a production matrix helper.

Secondary independent oracle:

- complete finite path enumeration on small fixtures.
- Paths remain separate until state-mass aggregation at each time index.

Exact fixtures:

- deterministic and rational/binary probability fixtures with hand-checkable distributions and expected visit counts.

Numerical boundary:

- a transition-total drift fixture is accepted at model-validation tolerance initially but is required to fail once finite-horizon propagated total mass exceeds the same documented tolerance.

Simulation is not an exact correctness oracle for this capability.

## Qualification invariants

Targeted qualification covers:

1. Initial probability mass equals one within tolerance.
2. Probability mass is checked at every returned finite step.
3. Propagated state mass is non-negative and finite.
4. Delta-start compatibility with existing single-start semantics.
5. State-order invariance.
6. Equivalent transition-representation observable equivalence.
7. Unreachable-state zero mass.
8. Zero-probability transition invariance.
9. Absorbing/terminal mass accumulation by self-retention.
10. Recurrent graphs are evaluated for exactly the requested finite horizon; no limiting/stationary claim is made.
11. Identical input is deterministic and serialization-stable.
12. Production agrees with at least the dense-matrix and finite-path oracle families on applicable fixtures.

## Explicit non-claims

This contract does not qualify or implement:

- stationary or limiting distributions;
- first-passage or absorption-time distributions;
- latent, hidden, censored, or noisy observation inference;
- Bayesian filtering/posteriors;
- generalized structural-identifiability solving;
- arbitrary full reward/outcome distributions;
- cyclic policy optimization or generalized MDP optimization;
- causal or Shapley attribution.
