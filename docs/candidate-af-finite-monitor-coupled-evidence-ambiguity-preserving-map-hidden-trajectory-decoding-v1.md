# Candidate AF — finite monitor-coupled evidence ambiguity-preserving MAP hidden-trajectory decoding

Candidate AF adds an exact finite max-product/Viterbi inference functional over the already-qualified Candidate AE model and calibrated-evidence contract. Candidate A–AE APIs and sum-product semantics remain unchanged.

## Why this capability is distinct

Filtering and smoothing return time-local marginals. Their per-time modes do not generally identify the most probable complete hidden trajectory. A canonical discriminator uses path masses `AA=.35`, `AB=.05`, `BA=.34`, `BB=.26`: the per-time marginal modes form `BA`, while the joint MAP trajectory is `AA`.

## Contract

For Candidate AE hidden states `X`, deterministic monitor states `Q`, horizon `T`, initial distribution `mu0`, monitor `Q_0=q_init(X_0)`, `Q_t=delta_t(Q_{t-1},X_{t-1},X_t)`, initial calibrated evidence `l_0(i)`, and monitor-coupled evidence `c_t(q,i,j)`, the hidden-trajectory joint evidence mass is

`W(x_0:T)=mu0(x_0) l_0(x_0) product_t [A_{x_{t-1},x_t} c_t(q_{t-1},x_{t-1},x_t)]`.

Candidate AF returns the hidden trajectories maximizing `W`. Under a terminal monitor target set `F`, it maximizes the same mass restricted to `Q_T in F`. Posterior path probability divides by the already-qualified Candidate AE evidence or joint-event mass.

The production recurrence is log-domain max-product over `(X_t,Q_t)`. Equivalent parallel transitions are aggregated into the hidden-pair probability `A_ij`; concrete edge identity is not decoded. Terminal states retain existing implicit self-retention and still apply monitor-coupled evidence and deterministic monitor updates.

## Ambiguity preservation

The mathematical target is the finite MAP set. Production exposes an explicit non-negative `mapScoreTolerance` used only to classify Float64 log-score equality. Every detected co-MAP trajectory is returned in canonical hidden-path order. `maxReturnedMapTrajectories` and the decoding-backpointer guard are honesty guards: exceeding them is a hard failure, never silent truncation, beam search, random tie breaking, or top-k fallback.

## Runtime entry points

- `decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence`
- `decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates`
- `finiteMapHiddenTrajectoryDecodingResultToJson`
- `finiteMapHiddenTrajectoryConditionedDecodingResultToJson`

The request reuses the Candidate AE request core and adds `mapScoreTolerance` and `maxReturnedMapTrajectories`. Conditioned decoding additionally uses `targetMonitorStates`.

## Qualification

Candidate AF is qualified against independent complete concrete-transition path enumeration, raw-probability dense `X×Q` max-product dynamic programming, Candidate AE sum-product denominator consistency, positive-probability Float64 underflow, standard finite HMM/Viterbi and all-one Markov-path reductions, exact ties, strict near-ties, target restriction, evidence-scale metamorphics, label/order invariance, parallel split/merge, terminal self-retention, resource guards, checked serialization, and historical Candidate A–AE regression.

## Honesty boundary

Evidence, monitor-event, and joint-event impossibility return no fabricated MAP trajectory. A mathematically positive best-path probability that underflows direct Float64 representation remains possible and exposes its finite log score. Non-finite results and exceeded tie/backpointer guards are hard failures.

## Explicit exclusions

Candidate AF does not authorize general top-k/k-best non-MAP enumeration, beam or approximate Viterbi search, posterior trajectory sampling, minimum-Bayes-risk decoding, random tie breaking, silent tie truncation, parallel-edge-identity decoding, stochastic monitors, automatic regex/temporal-logic synthesis, unbounded monitor memory, evidence beyond Candidate AE, parameter learning, hard-EM/Viterbi training, iterative EM/Baum-Welch, Bayesian inference, structural hidden-state optimization, Monte Carlo fallback, infinite-horizon decoding, MDP/control optimization, a new Wave/Level/principal application, Showcase/EXTREP changes, or release of `QUALIFIED_SCOPE_HOLD`.
