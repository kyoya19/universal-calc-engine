# Candidate R — finite hidden-state pairwise smoothing v1

Authority: `ORF-ABC-HIDDEN-STATE-PAIRWISE-SMOOTHING-FOUNDATION-v1`

## Scope

This capability extends Candidate H full-sequence marginal smoothing under the same fixed finite hidden-state model, initial distribution, known finite observation kernel, observation timing, validation rules, and terminal implicit-self-retention semantics.

For observations `Y_0,...,Y_T`, it computes for every `0 <= t < T`:

`xi_t(i,j) = P(X_t=i, X_{t+1}=j | Y_0,...,Y_T)`.

It also reports posterior expected transition counts:

`E[N_ij | Y] = sum_t xi_t(i,j)`.

## Required consistency

For every mathematically possible sequence and every pairwise step:

- pairwise probabilities sum to one;
- `sum_j xi_t(i,j)` agrees with Candidate H smoothing at time `t`;
- `sum_i xi_t(i,j)` agrees with Candidate H smoothing at time `t+1`;
- expected transition counts equal the sum of pairwise posterior steps;
- the total expected transition count equals the number of transition indices `T`.

A one-observation sequence has no transition indices, returns an empty pairwise-step array, and returns a complete all-zero expected-transition-count matrix.

## Numerical method

Production uses Candidate C filtered probabilities together with an independently materialized known-model transition kernel, next-step emission probability, and log-domain backward future-evidence messages. Pairwise weights are normalized in log space. Direct Float64 underflow of the complete sequence probability does not imply mathematical impossibility.

## Impossible evidence

A mathematically impossible observation sequence remains an analytical success with `possible=false`. Pairwise posterior distributions and expected transition counts are not fabricated; expected counts are `null` and every requested pairwise step has `pairwiseDistribution=null`.

## Independent qualification

Primary oracle: complete finite hidden-path enumeration. Every hidden path is weighted independently from initial, transition, and emission factors; normalized path mass is aggregated by adjacent hidden-state pairs and by transition counts.

Secondary oracle: independent raw-joint forward/backward computation. It forms unscaled joint forward and backward masses and independently constructs pairwise joint mass before normalization.

Qualification also requires Candidate H row/column marginal reduction, expected-count conservation, deterministic-path and terminal reductions, order invariance, equivalent parallel-transition split/merge invariance, impossible-sequence honesty, underflow separation, and checked deterministic serialization.

## Explicit exclusions

This v1 does not perform EM/Baum-Welch, transition-parameter updates, observation-kernel learning, continuous fitting, Bayesian model/parameter posterior inference, Viterbi/MAP trajectory decoding, top-k trajectories, first-passage-conditioned pairwise smoothing, adaptive observation design, cyclic/general MDP optimization, global structural identification, or causal inference.

`QUALIFIED_SCOPE_HOLD` remains in force. This capability does not authorize a new Wave, Level, principal application, Showcase, EXTREP change, or global HOLD release.
