# Candidate AB — finite additive trajectory-functional calibrated-evidence joint distribution and conditioning v1

Authority: `ORF-ABC-FINITE-ADDITIVE-TRAJECTORY-FUNCTIONAL-CALIBRATED-EVIDENCE-JOINT-CONDITIONING-FOUNDATION-v1`

Operating mode remains `QUALIFIED_SCOPE_HOLD`; `globalHoldReleased=false` and `fullWaveRerunRequired=false`.

## Capability

Candidate AB joins Candidate AA additive trajectory-functional propagation with Candidate Z absolute calibrated local evidence likelihoods on one finite hidden trajectory.

For a fixed finite-state Markov process and horizon `T >= 0`:

- `V_0 = r_0(X_0)`
- `V_t = V_{t-1} + r_t(X_{t-1}, X_t)`
- `G = V_T`
- `l_t(i) = P(E_t | X_t=i)` with `0 <= l_t(i) <= 1`
- `P(E_0:T | X_0:T) = product_t l_t(X_t)`

The evidence-weighted augmented forward recurrence is

- `alpha_0(i,v) = mu_0(i) 1[v=r_0(i)] l_0(i)`
- `alpha_t(j,v) = l_t(j) sum_i alpha_{t-1}(i,v-r_t(i,j)) A_ij`

It yields prefix evidence mass `P(E_0:t)`, prefix evidence-conditioned joint state/value distributions, complete evidence likelihood `P(E)`, joint aggregate mass `P(E,G=g)`, and the exact evidence-conditioned aggregate PMF `P(G=g|E)`.

## Exact combined conditioning

The conditioning API additionally accepts one exact safe-integer target `G=g*` and computes the joint event `E intersect {G=g*}`.

The backward recurrence contains both the exact target constraint and future calibrated evidence. For a possible combined event it returns:

- `P(E,G=g*)`
- `P(G=g*|E)`
- `P(X_t | E,G=g*)`
- `P(X_t,X_{t+1} | E,G=g*)`
- posterior expected state-pair transition counts

Evidence-only impossibility, aggregate-only impossibility, and a zero-probability intersection of two individually possible events are kept distinct.

## Numerical and semantic boundaries

Additive values use Candidate AA signed JavaScript safe-integer ticks and exact integer support identity. Calibrated evidence uses Candidate Z absolute probability semantics. Likelihood rows are never normalized, rescaled, clipped, or interpreted as posterior/confidence vectors.

Mathematically positive evidence, support, or joint-event mass is preserved when direct Float64 probability underflows: the direct field is `null`, the log probability remains finite, and an explicit underflow diagnostic is set. Resource/support limit or exact-integer overflow is a hard failure; no approximate fallback is used.

Terminal states retain Candidate AA implicit self-retention with explicit post-terminal state-pair increments. Parallel concrete transitions sharing the same effective state pair remain split/merge invariant.

## Reductions and consistency

Qualification requires:

- all-one calibrated evidence reduces to Candidate AA
- zero additive functional reduces to Candidate Z with a point mass at `G=0`
- Candidate C/H/R/X/Y semantics reduce through Candidate Z likelihood construction
- `sum_g P(E,G=g) = P(E)`
- mixing `P(X_t|E,G=g)` over `P(G=g|E)` reconstructs Candidate Z smoothing
- the analogous pairwise mixture reconstructs Candidate Z pairwise posteriors
- future evidence changes full smoothing but cannot alter an earlier prefix-conditioned state/value result

## Independent qualification

Production sparse/log recurrence is checked against representations that do not call Candidate AB production logic:

1. complete concrete-transition path enumeration for joint evidence/value mass and combined posterior quantities
2. prefix-only path enumeration using evidence only through the requested prefix
3. raw-probability dense augmented state/value forward and exact-target backward convolution
4. independent log/closed-form underflow fixtures

Fixed discriminators additionally cover anti-independence, absolute evidence scale, joint impossibility, translation/scaling, state relabeling/input ordering, parallel transition split/merge, terminal self-retention, support guards, and checked deterministic serialization.

## Compatibility and exclusions

Historical Candidate A through AA request/result/runtime contracts remain unchanged. Candidate AB uses dedicated non-breaking entry points.

Excluded are arbitrary unnormalized soft weights, cross-time or transition-conditioned evidence factors, non-additive path functionals, interval/set/noisy/multiple/prefix aggregate observations, parameter learning from Candidate AB posteriors, iterative EM/Baum-Welch, Bayesian inference, Viterbi/MAP/top-k decoding, approximate histogram/FFT/Monte Carlo fallback, MDP/control/risk optimization, application-specific qualification, new Wave/Level/Showcase/EXTREP work, and release of `QUALIFIED_SCOPE_HOLD`.
