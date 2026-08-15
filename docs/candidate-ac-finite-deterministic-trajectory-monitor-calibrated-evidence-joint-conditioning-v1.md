# Candidate AC — finite deterministic trajectory-monitor calibrated-evidence joint conditioning

Candidate AC adds one finite deterministic monitor carried alongside the unchanged finite hidden trajectory. It generalizes Candidate AA/AB scalar additive path summaries to exact finite-memory path properties while preserving Candidate Z absolute calibrated local-evidence semantics.

## Contract

For finite hidden states `X`, finite monitor states `Q`, horizon `T`, initial distribution `mu0`, calibrated local evidence `l_t(i)=P(E_t|X_t=i)`, initial monitor map `q_init(i)`, and deterministic monitor transition `delta_t(q,i,j)`:

- `Q_0 = q_init(X_0)`.
- `Q_t = delta_t(Q_{t-1}, X_{t-1}, X_t)` for `t=1..T`.
- evidence factorization remains `product_t l_t(X_t)`.
- forward state is the exact augmented pair `(X_t,Q_t)`.
- the analysis returns prefix evidence-conditioned augmented distributions, `P(E,Q_T=q)`, and `P(Q_T=q|E)`.
- conditioning uses one final monitor-state set `F`, with event `H_F={Q_T in F}` and returns `P(E,H_F)`, `P(H_F|E)`, augmented smoothing, hidden-state pairwise posteriors, and posterior expected hidden transition counts.

The monitor observes only its current state and the hidden source/destination state pair. It cannot distinguish parallel-transition identity. Terminal hidden states retain the existing implicit self-retention semantics, and the monitor still updates on every remaining horizon step.

## Runtime entry points

- `analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence`
- `conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates`
- `finiteDeterministicTrajectoryMonitorCalibratedEvidenceResultToJson`
- `finiteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResultToJson`

Existing Candidate A through AB APIs are unchanged.

## Qualified reductions required by the authority

- one-state monitor -> Candidate Z;
- finite exact additive-support monitor compiler -> Candidate AB;
- the same compiler with all evidence likelihoods equal to one -> Candidate AA;
- first-hit-step monitor compiler -> Candidate B;
- one-state/all-one evidence hidden marginals -> Candidate A;
- Candidate C/H/R/X/Y continue to reduce through their Candidate Z calibrated-likelihood construction.

## Failure and honesty boundary

Malformed or incomplete monitor definitions are hard failures. Empty target monitor-state sets and well-formed impossible evidence/events are analytical results, not malformed requests. Positive mathematical probabilities that underflow direct Float64 representation retain finite log probability and explicit underflow diagnostics. Resource guards fail explicitly and never trigger state truncation, sampling, Monte Carlo, approximate state merging, or another approximation fallback.

## Explicit exclusions

Candidate AC does not authorize probabilistic/nondeterministic monitors, automatic regex/temporal-logic monitor synthesis, unbounded monitor memory, transition-conditioned or cross-time evidence factors, parameter learning, iterative EM/Baum-Welch, Bayesian inference, Viterbi/MAP/top-k decoding, infinite-horizon monitor analysis, MDP/control optimization, new Wave/Level/application/Showcase/EXTREP work, or release of `QUALIFIED_SCOPE_HOLD`.
