# Candidate H — Finite Hidden-State Smoothing v1

Authority: `ORF-ABC-HIDDEN-STATE-SMOOTHING-FOUNDATION-v1`

Operating mode: `QUALIFIED_SCOPE_HOLD`

## Purpose

Candidate H adds finite full-sequence hidden-state smoothing for one fixed, validated hidden-state model with a known observation kernel. It extends Candidate C filtering without changing Candidate C timing, validation, impossibility, likelihood, terminal-state, or underflow semantics.

For observations `Y_0=y_0,...,Y_T=y_T`, Candidate H returns the posterior marginal

`P(X_t=x | Y_0=y_0,...,Y_T=y_T)`

for every observation step `0 <= t <= T` when the complete observation sequence is mathematically possible.

## Timing and model contract

Candidate C remains the semantic authority for the input model and observation request.

The timing is:

1. draw `X_0` from the explicit initial distribution;
2. emit `Y_0` from `X_0`;
3. for each `t >= 1`, transition `X_{t-1} -> X_t` and then emit `Y_t` from `X_t`.

Terminal states retain Candidate C's implicit self-retention semantics.

Inputs are not silently normalized. Candidate C validation failures are returned unchanged.

## Smoothing semantics

Production first obtains Candidate C's scaled filtering result. For a possible sequence it computes future-evidence messages backward from the final observation and combines them with Candidate C filtered state probabilities.

The final-step smoothing marginal must equal Candidate C's `finalFilteredDistribution` within qualification tolerance because there is no future evidence after step `T`.

Each possible-sequence smoothed marginal must contain finite, non-negative probabilities whose total is 1 within tolerance.

## Impossible complete sequences

If Candidate C classifies the observation sequence as mathematically impossible, Candidate H returns a valid `possible: false` result.

Conditioning on an impossible complete sequence is undefined. Candidate H therefore returns `null` smoothed distributions rather than fabricating posterior state probabilities.

## Underflow semantics

Direct Float64 sequence-probability underflow is not mathematical impossibility.

When Candidate C retains a finite log likelihood for a mathematically possible sequence but `sequenceProbability` underflows, Candidate H must continue to return finite smoothed marginals when its scaled/log-domain messages remain finite.

## Output boundary

Candidate H returns marginal posterior state distributions at individual time steps. These marginals are not a decoded hidden trajectory.

Candidate H v1 does **not** compute:

- Viterbi or MAP hidden-state paths;
- top-k hidden paths;
- pairwise adjacent-state posterior transition marginals;
- expected transition counts;
- EM or Baum-Welch learning;
- unknown transition or observation-kernel fitting;
- Bayesian model or parameter posteriors;
- first-passage-conditioned smoothing;
- stationary or limiting distributions;
- cyclic/general MDP solutions;
- adaptive experiment design;
- causal or counterfactual claims.

## Determinism

State output ordering is canonical and does not depend on model-state order, initial-distribution entry order, or observation-kernel entry order. Checked JSON serialization rejects non-finite numeric values.

## Independent qualification oracles

Candidate H qualification must not use the production smoothing recurrence as its expected-value oracle.

The primary oracle is complete finite hidden-trajectory enumeration. Every finite state path is assigned its initial, transition, and emission probability; joint mass is grouped by state at each time and normalized by total sequence mass.

The secondary oracle is an independently constructed raw-joint dense forward/backward calculation:

- `forward_t(x) = P(X_t=x, Y_0,...,Y_t)`
- `backward_t(x) = P(Y_{t+1},...,Y_T | X_t=x)`
- the smoothing marginal is proportional to their product.

Required reduction/metamorphic checks include final smoothing versus Candidate C final filtering, informative future evidence revising an earlier filter, state-independent future emission evidence leaving an earlier filter unchanged, perfectly revealing observations, impossible-sequence handling, direct-probability underflow separation, input-order invariance, and terminal self-retention compatibility.

## Governance boundary

Candidate H is a targeted generalized capability only. It does not release `QUALIFIED_SCOPE_HOLD`, replace the historical project-wide subject, authorize a new Wave or Level, introduce a principal application or Showcase, or change EXTREP state.
