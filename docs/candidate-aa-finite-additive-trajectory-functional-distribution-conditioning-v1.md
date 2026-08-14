# Candidate AA — finite additive trajectory-functional distribution and exact aggregate-value conditioning v1

Authority: `ORF-ABC-FINITE-ADDITIVE-TRAJECTORY-FUNCTIONAL-DISTRIBUTION-CONDITIONING-FOUNDATION-v1`

Operating mode remains `QUALIFIED_SCOPE_HOLD`; this capability does not release the global hold.

## Mathematical contract

For a fixed validated finite-state Markov model, finite horizon `T >= 0`, initial distribution `mu0`, and signed JavaScript safe-integer tick contributions,

- `V_0 = r_0(X_0)`
- `V_t = V_{t-1} + r_t(X_{t-1}, X_t)` for `t=1,...,T`
- `G = V_T`

The forward API returns exact finite-support joint state/value distributions and the final PMF of `G`. Support identity is exact safe-integer equality; no floating bucket tolerance, rounding, histogram approximation, Monte Carlo, or automatic fallback is used.

The inverse API conditions only on one exact final aggregate event `G=g*`. It returns full-event state smoothing, adjacent-state pairwise posteriors, and posterior expected state-pair transition counts. It does not label those results as prefix filtering.

For every positive-support aggregate value, Kiyotan/Seikatan mixture consistency requires the mixture of aggregate-conditioned state and pairwise marginals to recover their unconditional counterparts.

## State-pair and terminal semantics

Each increment is attached to the effective state pair `(fromStateId,toStateId)`, not a concrete parallel transition identity. Parallel concrete transitions sharing a state pair use one shared increment; splitting or merging those parallel probabilities cannot change Candidate AA mathematics.

Terminal states use Candidate A-compatible implicit self-retention. Every effective terminal self-retention pair must have an explicit increment at every post-initial step. The implementation does not silently assign zero terminal reward.

## Numerical semantics

All initial, transition, target, and reachable cumulative values are JavaScript safe integers. A support/resource limit breach or cumulative safe-integer overflow is a hard failure.

Mathematically positive support atoms are preserved even when their direct Float64 probability underflows. Such atoms report `probability=null`, a finite `logProbability`, and `probabilityUnderflowed=true`. Exact target events use the analogous event fields. A target outside mathematical support is `ok=true, possible=false`, not an underflow and not a malformed request.

## Independent qualification

Qualification requires:

1. Complete concrete-transition path enumeration that independently computes path probabilities, exact aggregate buckets, conditioned smoothing, pairwise posteriors, and expected counts.
2. An independent dense state-by-integer-support forward/backward convolution oracle with a representation distinct from production.
3. An independent closed-form/log-domain underflow fixture.

Required reductions/metamorphics include zero functional to Candidate A state propagation, visit-count expectation to Candidate A occupancy, state-pair count expectation consistency, exact-event atom equality, Kiyotan/Seikatan mixture consistency, `T=0`, integer translation/scaling, hidden-state relabeling, input ordering, parallel-transition split/merge, terminal self-retention, and a lossless safe-integer intersection check against existing `solveExpectedReward` semantics.

## Compatibility and exclusions

Historical Candidate A/C/H/R/S/T/U/V/W/X/Y/Z request/result/runtime contracts remain unchanged. Candidate AA does not silently compose `G=g*` with exact observations, Candidate X masks, Candidate Y observation sets, or Candidate Z calibrated evidence. Candidate AA posterior statistics are not fed into S/T/U/V/W re-estimation in v1.

Excluded from v1 are non-additive path functionals, max/min functionals, edge-identity-specific rewards for parallel transitions, continuous/unbounded values, approximate histograms/FFT/Monte Carlo, vector-valued joint functionals, interval/set/noisy/multiple/prefix aggregate observations, simultaneous evidence composition, parameter learning/re-estimation, iterative EM, Bayesian inference, Viterbi/MAP/top-k decoding, infinite-horizon reward distributions, risk/CVaR optimization, MDP/control, topology discovery, application-specific work, new Wave/Level/Showcase/EXTREP changes, and release of `QUALIFIED_SCOPE_HOLD`.
