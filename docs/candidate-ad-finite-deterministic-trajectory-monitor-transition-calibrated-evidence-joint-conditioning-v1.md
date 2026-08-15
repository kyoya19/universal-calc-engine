# Candidate AD — finite deterministic trajectory-monitor transition-calibrated-evidence joint conditioning

Candidate AD extends the qualified Candidate AC finite deterministic trajectory monitor from state-local calibrated evidence to adjacent hidden-transition-local calibrated evidence while preserving the existing finite hidden model and every historical Candidate A–AC API.

## Contract

For hidden states `X`, monitor states `Q`, horizon `T`, initial distribution `mu0`, initial calibrated evidence `l_0(i)=P(E_0|X_0=i)`, transition-calibrated evidence `m_t(i,j)=P(E_t|X_{t-1}=i,X_t=j)` for `t>=1`, initial monitor map `q_init(i)`, and deterministic monitor transition `delta_t(q,i,j)`:

- `Q_0=q_init(X_0)`.
- `Q_t=delta_t(Q_{t-1},X_{t-1},X_t)`.
- evidence factorization is `l_0(X_0) product_{t=1..T} m_t(X_{t-1},X_t)`.
- every evidence likelihood is an absolute calibrated probability in `[0,1]`; rows are never normalized, rescaled, clipped, or max-to-one transformed.
- forward state is the exact augmented pair `(X_t,Q_t)`.
- analysis returns prefix evidence mass/distributions, `P(E,Q_T=q)`, and `P(Q_T=q|E)`.
- conditioning uses one terminal monitor-state set `F`, `H_F={Q_T in F}`, and returns `P(E,H_F)`, `P(H_F|E)`, augmented smoothing, hidden-state adjacent pairwise posteriors, and posterior expected hidden transition counts.

The initial evidence row explicitly covers every declared hidden state exactly once. Each transition-evidence layer explicitly covers every ordered declared hidden-state pair exactly once, including pairs with zero model transition mass. Zero-mass pairs are structurally required but analytically inert.

Evidence and the deterministic monitor observe hidden source/destination state pairs, not concrete parallel-edge identity. Parallel transitions sharing a hidden pair therefore share one `m_t(i,j)`. Terminal hidden states retain implicit self-retention; each remaining self-retained step applies `m_t(i,i)` and still updates the monitor.

## Runtime entry points

- `analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence`
- `conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates`
- `finiteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceResultToJson`
- `finiteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceConditioningResultToJson`

These are dedicated non-breaking entry points. Candidate A–AC request types remain unchanged.

## Required reductions

- If `m_t(i,j)=l_t(j)` for every source `i`, Candidate AD reduces to Candidate AC.
- With a one-state monitor and destination-only pair evidence, Candidate AD reduces to Candidate Z.
- Candidate AC finite-support additive-monitor compilation plus destination-only evidence reduces to Candidate AB.
- The same additive compiler with all-one evidence reduces to Candidate AA.
- Candidate AC first-passage monitor compilation with all-one evidence reduces to Candidate B.
- A one-state monitor with all-one evidence reduces hidden marginals to Candidate A.

## Independent qualification

Candidate AD is qualified against four independent reference strategies: complete concrete-transition path enumeration, genuinely prefix-only enumeration, raw-probability dense `X×Q` forward/backward arrays, and an independent positive-probability underflow fixture. The primary discriminator uses two positive transitions to the same destination with different evidence likelihoods, for example `m(A,C)=0.9` and `m(B,C)=0.1`.

Qualification also covers absolute evidence-scale preservation, disjoint target-set additivity, evidence/monitor/joint impossibility separation, ordering and relabeling invariance, parallel-transition split/merge, terminal self-retention, zero-mass pair harmlessness, resource guards, deterministic checked serialization, and historical regression.

## Failure and honesty boundary

Malformed or incomplete pair-evidence structures and monitor definitions are hard failures. Empty target monitor sets and structurally valid zero-probability evidence/events are analytical impossibility results. A mathematically positive probability that underflows direct Float64 representation remains possible and retains its finite log probability with explicit underflow diagnostics. Resource limits fail explicitly and never trigger approximation.

## Explicit exclusions

Candidate AD does not authorize cross-time or non-adjacent evidence, parallel-edge-identity evidence, monitor-conditioned evidence, probabilistic monitors, automatic regex/temporal-logic synthesis, unbounded monitor memory, parameter learning, iterative EM/Baum-Welch, Bayesian inference, Viterbi/MAP/top-k decoding, approximate state merging, histogram/FFT or Monte Carlo fallback, infinite-horizon monitor analysis, MDP/control optimization, a new Wave/Level/application, Showcase/EXTREP state change, or release of `QUALIFIED_SCOPE_HOLD`.
