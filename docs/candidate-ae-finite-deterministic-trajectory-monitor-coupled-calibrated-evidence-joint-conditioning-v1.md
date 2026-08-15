# Candidate AE — finite deterministic trajectory-monitor-coupled calibrated-evidence joint conditioning

Candidate AE extends the qualified Candidate AD evidence contract from adjacent hidden-pair-local calibrated likelihoods to likelihoods that may also depend on the current finite deterministic monitor state. It preserves every historical Candidate A–AD API and does not authorize arbitrary cross-time evidence.

## Contract

For finite hidden states `X`, finite monitor states `Q`, horizon `T`, initial distribution `mu0`, deterministic monitor `Q_0=q_init(X_0)` and `Q_t=delta_t(Q_{t-1},X_{t-1},X_t)`:

- time-0 evidence remains `l_0(i)=P(E_0|X_0=i)`;
- for `t>=1`, Candidate AE accepts `c_t(q,i,j)=P(E_t|Q_{t-1}=q,X_{t-1}=i,X_t=j)`;
- every likelihood is an absolute calibrated probability in `[0,1]`;
- evidence factorization is `l_0(X_0) product_{t=1..T} c_t(Q_{t-1},X_{t-1},X_t)`;
- earlier hidden history may affect evidence only through the explicitly declared finite monitor state `Q_{t-1}`;
- no input evidence normalization, arbitrary rescaling, clipping, or max-to-one transformation is applied.

The exact augmented forward state is `(X_t,Q_t)`:

`alpha_0(i,q)=mu0(i) 1[q=q_init(i)] l_0(i)`

`alpha_t(j,q')=sum_{i,q:delta_t(q,i,j)=q'} alpha_{t-1}(i,q) A_ij c_t(q,i,j)`.

Prefix mass is `P(E_0:t)`. Future monitor/evidence layers do not enter prefix outputs. Final monitor joint mass is `P(E,Q_T=q)`.

For a terminal monitor-state target set `F`, `H_F={Q_T in F}`, Candidate AE computes `P(E,H_F)`, `P(H_F|E)`, exact augmented smoothing, hidden and monitor marginals, adjacent hidden-state pairwise posteriors, and posterior expected hidden transition counts using the matching finite log-domain backward recurrence.

## Evidence structure

At time 0 every declared hidden state appears exactly once. At every later time layer every declared monitor state crossed with every ordered declared hidden-state pair appears exactly once, including unreachable monitor states and zero-model-mass hidden pairs. Such unreachable/zero-mass rows are structurally required but analytically inert.

Evidence and the monitor observe hidden source/destination states, not concrete parallel-edge identity. Terminal hidden states retain existing implicit self-retention; each retained step applies `c_t(q,i,i)` and updates the deterministic monitor.

## Runtime entry points

- `analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence`
- `conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates`
- `finiteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceResultToJson`
- `finiteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningResultToJson`

These are dedicated non-breaking entry points. Candidate A–AD request types remain unchanged.

## Required reductions

- If `c_t(q,i,j)=m_t(i,j)` for every `q`, Candidate AE reduces to Candidate AD.
- If `c_t(q,i,j)=l_t(j)`, Candidate AE reduces to Candidate AC.
- A one-state monitor with destination-only evidence reduces to Candidate Z.
- The qualified finite-support additive-monitor compiler plus destination-only evidence reduces to Candidate AB.
- The same compiler with all-one evidence reduces to Candidate AA.
- The qualified first-passage monitor compiler with all-one evidence reduces to Candidate B.
- A one-state monitor with all-one evidence reduces hidden marginals to Candidate A state-distribution propagation.
- Compiling `(X,Q)` into one augmented hidden-state space provides an additional Candidate AD reduction cross-check; it is not the primary independent oracle.

## Independent qualification

Candidate AE qualification requires complete concrete-transition path enumeration, genuinely prefix-only path enumeration, and raw-probability dense `X×Q` forward/backward arrays that do not call the Candidate AE production recurrence. A positive-probability Float64-underflow fixture independently checks finite log probability and explicit underflow classification. The principal discriminator uses two histories that reach the same hidden pair but have different finite monitor states and therefore different calibrated evidence likelihoods.

Qualification also covers absolute full-layer evidence-scale preservation, all-target neutrality, disjoint-target additivity, evidence/monitor/joint impossibility separation, hidden/monitor relabeling, request ordering, unreachable-monitor and zero-model-mass harmlessness, parallel split/merge, terminal self-retention, resource guards, deterministic checked serialization, non-finite rejection, and historical API regression.

## Failure and honesty boundary

Malformed monitor/evidence structures, invalid likelihoods, resource-limit excess, conservation failures, and non-finite internal analytical values are hard failures. Empty target sets and structurally valid zero-probability events are analytical impossibility results. A mathematically positive mass that underflows direct Float64 representation remains possible, exposes a finite log probability, and carries explicit underflow diagnostics. Resource guards never trigger approximation.

## Explicit exclusions

Candidate AE does not authorize arbitrary cross-time evidence outside the declared finite monitor, hidden-history dependence outside `Q_{t-1},X_{t-1},X_t`, future-state-dependent evidence, parallel-edge-identity evidence, probabilistic/nondeterministic monitors, automatic regex/temporal-logic synthesis, unbounded monitor memory, parameter learning, iterative EM/Baum-Welch, Bayesian inference, Viterbi/MAP/top-k decoding, approximate state merging, histogram/FFT approximation, sampling/Monte Carlo fallback, infinite-horizon monitor analysis, MDP/control optimization, a new Wave/Level/principal application, Showcase or EXTREP authoritative-state changes, or release of `QUALIFIED_SCOPE_HOLD`.
