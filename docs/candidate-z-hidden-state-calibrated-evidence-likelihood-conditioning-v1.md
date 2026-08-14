# Candidate Z — finite hidden-state calibrated evidence-likelihood conditioning v1

Candidate Z adds fixed-model conditioning on calibrated local evidence-event likelihoods without modifying Candidate A/C/H/R/S/T/U/V/W/X/Y request or runtime contracts.

## Mathematical contract

For each finite evidence time t and every declared hidden state i, the caller supplies an absolute conditional probability

`l_t(i) = P(E_t | X_t=i)`, with `0 <= l_t(i) <= 1`.

The authoritative local-evidence factorization is

`P(E_0,...,E_T | X_0=x_0,...,X_T=x_T) = product_t l_t(x_t)`.

The values are calibrated event probabilities, not posterior/confidence vectors, scores, energies, arbitrary nonnegative potentials or likelihoods known only up to common scale. The engine checks structure and numeric range but does not estimate or certify external calibration.

Prefix filtering conditions only on `E_0...E_t`. Full smoothing and adjacent-state pairwise smoothing condition on the complete evidence sequence. Expected transition counts sum pairwise posterior distributions over transition indices.

## Absolute-scale semantics

No likelihood row is normalized, rescaled, clipped, silently completed or silently deduplicated. Multiplying every entry in one row by a valid common factor c changes the complete evidence probability by c while leaving normalized posterior distributions unchanged. A constant row c<1 is posterior-neutral but likelihood-nonneutral. The uniquely evidence-neutral constant row is all ones.

The qualification includes the fixed anti-rescaling discriminator `(0.2,0.6)` versus `(0.1,0.3)` under prior `(0.5,0.5)`: both produce posterior `(0.25,0.75)`, while event probabilities are 0.4 and 0.2 respectively.

## Dedicated API

Runtime entry points:

- `conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods`
- `finiteHiddenStateCalibratedEvidenceLikelihoodConditioningResultToJson`

The dedicated request contains `initialDistribution` and a finite non-empty `evidenceLikelihoods` sequence. Every likelihood row explicitly lists every declared hidden state exactly once as `{stateId, likelihood}`. Missing, unknown or duplicate states are hard failures. Row entry order is semantically irrelevant.

Candidate Z does not add alphabet, observation kernel, exact observations, Candidate X state masks or Candidate Y observation sets to its request.

## Required reductions

- Candidate C filtering/likelihood: `l_t(i)=B_i(y_t)`.
- Candidate H smoothing: `l_t(i)=B_i(y_t)`.
- Candidate R pairwise smoothing/expected counts: `l_t(i)=B_i(y_t)`.
- Candidate X: `l_t(i)=B_i(y_t) * 1[i in S_t]`.
- Candidate Y: `l_t(i)=sum_{a in O_t} B_i(a)`.
- X+Y hard-composition qualification fixture: `l_t(i)=1[i in S_t] * sum_{a in O_t}B_i(a)`.
- All-one rows represent evidence-neutral times.
- All-zero rows represent valid probability-zero evidence and therefore `possible=false` rather than request failure.

Candidate C/Y historically serialize a positive direct-probability underflow as null, whereas Candidate X retains numeric zero with an explicit underflow diagnostic. Candidate Z reductions therefore require mathematical posterior/log-likelihood/impossibility/underflow equivalence, not raw JSON identity of that historical direct field. Candidate Z itself returns null for an unrepresentable positive direct probability.

## Independent qualification

Qualification uses four independent oracle families:

1. complete hidden-path enumeration using direct initial, transition and supplied local-likelihood products;
2. prefix-only hidden-path enumeration that excludes all future evidence;
3. raw-probability dense forward/backward alpha/beta calculations independent of production log-domain recurrence;
4. a closed-form log-probability underflow fixture rather than treating an already-underflowed Float64 product as impossibility evidence.

Qualification also covers absolute anti-rescaling, constant-row semantics, future-evidence filtering/smoothing separation, C/H/R/X/Y reductions, X+Y hard composition, pairwise marginal consistency, expected-count conservation, row ordering, transition splitting, terminal implicit self-retention, one-step pairwise/count semantics, impossible evidence honesty, checked serialization and malformed/non-finite/out-of-range likelihood rejection.

## Failure and underflow semantics

Malformed containers or rows, incomplete state coverage, unknown/duplicate states, non-finite or out-of-range likelihoods, invalid tolerances, conservation failures, structural inconsistencies and non-finite analytical outputs are hard failures.

An all-zero row is valid probability-zero evidence. A row with positive entries can also be dynamically impossible when every predictively supported state has zero likelihood. At the first zero-mass prefix, Candidate Z returns analytical success with `possible=false`; earlier prefix filters may remain, while complete smoothing, pairwise posteriors and expected counts are null.

A mathematically positive event whose direct Float64 probability underflows remains `possible=true`, retains finite log likelihood and posterior quantities, returns a null direct combined probability, and diagnoses the underflow explicitly.

## Scope boundary

Candidate Z does not authorize arbitrary unnormalized soft weights, posterior/confidence vectors as likelihoods, scale-free likelihood ratios, calibration estimation/certification, cross-time or transition-conditioned evidence factors, a separate X+Y runtime API, missingness/reporting-process inference, Candidate S/T/U/V/W learning from Candidate Z posterior statistics, iterative EM/Baum-Welch, trajectory weights, Bayesian inference, Viterbi/MAP, continuous evidence models, topology/state/alphabet discovery, adaptive design, causal claims, new Wave/Level/application/Showcase, EXTREP changes or global HOLD release.

`QUALIFIED_SCOPE_HOLD` remains in force.
