# Candidate B — finite first-passage / absorption-time foundation v1

Authority: `ORF-ABC-FIRST-PASSAGE-ABSORPTION-FOUNDATION-v1`

## Purpose

This targeted capability computes a finite-horizon first-entry-time distribution for a declared set of states in a validated finite `DefinitionModel`.

It answers **when a target is reached for the first time**. It does not reinterpret state occupancy, expected visit count, or repeated target visits as additional first-passage events.

## Request

`FiniteFirstPassageRequest` contains:

- `initialDistribution`: sparse explicit state-probability entries using the Candidate A convention;
- `targetStates`: a non-empty array of unique known state IDs;
- `horizon`: a non-negative integer `H`.

Options:

- `probabilityTolerance`: finite positive number, default `1e-9`;
- `maxHorizon`: non-negative integer, default `10000`.

Omitted initial states have probability zero. Initial probabilities must be finite values in `[0,1]` and sum to one within tolerance. Input is never silently normalized.

## Mathematical contract

For target set `T`, define

`tau_T = inf { t >= 0 : X_t in T }`.

Initial target mass is a first hit at step zero:

`P(tau_T = 0, X_0 = j) = mu_0(j)` for `j in T`.

For non-target state `s`, let `u_t(s)` be unnormalized probability mass that is at `s` at step `t` and has not entered `T` at any earlier step.

For `t >= 1`:

`u_t(s) = sum_{r notin T} u_{t-1}(r) P(r,s)` for `s notin T`.

For target `j in T`, first-hit boundary flux is

`h_t(j) = sum_{r notin T} u_{t-1}(r) P(r,j)`.

Then

- `f_t = P(tau_T=t) = sum_{j in T} h_t(j)`;
- `F_t = P(tau_T<=t) = sum_{k=0}^t f_k`;
- `S_t = P(tau_T>t) = sum_{s notin T} u_t(s)`;
- `F_t + S_t = 1` subject only to the disclosed float64 tolerance.

No normalization is applied to survivor mass.

## Target semantics

A target does not have to be terminal in the source model. Once mass first enters a target it is removed from the survivor recursion because later motion is irrelevant to the first-entry event. This bookkeeping does not mutate `DefinitionModel` and does not globally redefine the target as terminal.

A non-target terminal state uses the existing implicit-self-retention semantics and therefore remains not-yet-hit forever unless it was itself declared as a target.

When all targets are absorbing/terminal event states, the same `tau_T` is an absorption time. When a target is non-terminal, the result is a first-entry-time analysis.

## Result

`analyzeFiniteHorizonFirstPassage` returns steps `0..H`. Each step contains:

- `firstHitProbability`;
- `cumulativeHitProbability`;
- `notYetHitProbability`;
- `firstHitByTarget`, ordered by state ID.

The success result also returns:

- sorted `targetStates`;
- `hitProbabilityByHorizon`;
- `notHitProbabilityByHorizon`;
- `firstHitByTargetTotals` through `H`;
- diagnostics declaring the sparse survivor-boundary-flux method, float64 representation, no simulation, no input normalization, and no infinite-horizon claim.

`finiteFirstPassageResultToJson` rejects non-finite numeric values instead of allowing JSON coercion to hide them.

## Failure semantics

Explicit failures include invalid options/model/initial distribution, unknown or duplicate initial states, invalid initial probabilities or total, malformed/empty/unknown/duplicate target states, invalid/excessive horizon, mass-conservation violations, and non-finite analytical results.

An unreachable target is **not** a request failure. It produces zero first-hit mass and corresponding survivor probability through the requested horizon.

## Independent qualification

Production uses sparse survivor probability-mass propagation and target boundary flux.

Qualification must not use a copy of that production loop as its sole oracle. Candidate B is checked against:

1. complete finite path enumeration, assigning each path exactly once to its earliest target entry or to the not-hit-by-horizon remainder;
2. an independently built dense transition matrix with target rows replaced by identity only inside the oracle, where transformed target occupancy is the first-hit CDF and successive differences are the PMF;
3. target-specific boundary-flux and analytically known deterministic/geometric fixtures;
4. metamorphic order, target-order, split-transition, zero-edge, unreachable-target, step-zero, and source-model-preservation checks.

Simulation alone is not an exact oracle.

## Compatibility

This capability is additive.

It does not change:

- Candidate A state-distribution/occupancy or expected-visit-count semantics;
- Candidate C hidden-state observation filtering;
- Candidate D finite-family distinguishability/identifiability classification;
- existing `DefinitionModel`, forward reward/time/reachability, inverse likelihood, contribution, sensitivity, or decision APIs.

Occupancy probability must not be relabeled first-hit probability. Expected visit count must not be relabeled expected first-passage time.

## Explicit exclusions

This authority does not add infinite-horizon eventual hitting probability, infinite-horizon mean absorption time, absorbing-chain fundamental matrices, stationary/limiting/quasi-stationary distributions, continuous-time first passage, inverse inference from passage-time observations, policy optimization, optimal stopping, arbitrary MDP optimization, new principal applications/domains, new Showcases, Wave 4, Level 9, ORF-30-CROSS-DOMAIN, or ORF-40-TSUMOLOGY.

`QUALIFIED_SCOPE_HOLD` remains active.
