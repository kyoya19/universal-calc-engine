# Candidate AH — Finite Multi-Trajectory Deterministic-Monitor-Coupled Calibrated-Evidence Joint Initial-Distribution and Transition One-Step Re-estimation

Authority: `ORF-ABC-FINITE-MULTI-TRAJECTORY-DETERMINISTIC-MONITOR-COUPLED-CALIBRATED-EVIDENCE-JOINT-INITIAL-TRANSITION-REESTIMATION-FOUNDATION-v1`

Candidate AH is a targeted one-step learning bridge from the already-qualified Candidate AE posterior semantics to a common-model initial-distribution and hidden-transition M-step.

## Contract

A finite non-empty collection of independent evidence records shares one immutable current hidden-state model `(mu, A)`. Each record uses Candidate AE deterministic-monitor-coupled calibrated evidence and may optionally condition on a terminal monitor-state set.

Every record E-step is evaluated under the same current `(mu, A)` before any parameter is changed. The implementation freezes:

- posterior initial-state probabilities `G_i^(k) = P(X_0=i | Z^(k))`;
- posterior expected hidden transition counts `N_ij^(k)` for parameterized nonterminal source states.

The batch sufficient statistics are

`G_i = sum_k G_i^(k)`

and

`N_ij = sum_k N_ij^(k)`.

Exactly one simultaneous M-step is applied:

`mu'_i = G_i / K`.

For a nonterminal source state `i`, let `D_i = sum_j N_ij`. If `D_i` exceeds the declared count tolerance,

`A'_ij = N_ij / D_i`.

If `D_i` is zero within tolerance, the current row is retained and is reported as non-unique/no-information. Terminal implicit self-retention remains structural probability one and is excluded from learned transition counts.

Parallel transitions between the same hidden pair remain hidden-pair-equivalent: an updated aggregate hidden-pair probability is redistributed across existing parallel edges in proportion to their current edge probabilities. The transition topology does not change.

After the M-step, every record event likelihood is recomputed independently under `(mu', A')` with all calibrated evidence and deterministic monitor definitions unchanged. The total log likelihood must not decrease beyond `likelihoodTolerance`.

## What is not learned

Candidate AH does not update an observation kernel, calibrated evidence likelihoods, or deterministic monitor transitions. It does not perform a second iteration. Iterative EM/Baum-Welch, hard-EM/Viterbi training, posterior sampling, Bayesian inference, topology discovery, regularization, pseudocounts, record weighting, streaming/online EM, approximation, and Monte Carlo fallback are outside scope.

## Analytical honesty

A mathematically impossible record makes the dataset analytically `possible=false`; no updated model is fabricated. A mathematically positive event whose direct Float64 probability underflows remains possible and retains a finite log probability. Resource limits fail rather than truncating or approximating.

## Qualification

Candidate AH qualification uses independent complete concrete-transition/hidden-path enumeration to derive per-record posterior initial masses and transition counts, aggregate them across records, construct the independent M-step, and recompute current and updated event likelihoods. A separate expected-complete-data objective check verifies the analytic simplex optimum on finite fixtures.

Fixed discriminators include:

- common-current batch update versus sequential per-record parameter updates;
- independent records versus synthetic trajectory concatenation;
- Candidate AE posterior-statistic consistency;
- `K=1` standard-HMM reduction to Candidate V initial/transition update blocks;
- multi-record standard-HMM reduction to Candidate W initial/transition update blocks;
- record permutation and full-dataset replication invariance;
- legal evidence-scale invariance of the posterior/M-step;
- monitor-history-dependent calibrated evidence;
- parallel-transition split/merge;
- terminal implicit self-retention exclusion from learned counts;
- zero-departure row retention;
- impossible-event honesty and positive-probability underflow separation;
- deterministic checked serialization and non-finite rejection.

Candidate A through AG request/result APIs remain unchanged.

`QUALIFIED_SCOPE_HOLD`, `globalHoldReleased=false`, and `fullWaveRerunRequired=false` remain unchanged.
