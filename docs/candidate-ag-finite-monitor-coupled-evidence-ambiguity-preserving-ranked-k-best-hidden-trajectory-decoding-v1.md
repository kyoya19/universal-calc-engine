# Candidate AG — finite monitor-coupled evidence ambiguity-preserving ranked K-best hidden-trajectory decoding

Candidate AG extends the qualified Candidate AF MAP decoder into exact finite ranked hidden-trajectory decoding under the unchanged Candidate AE deterministic-monitor-coupled calibrated-evidence model. Candidate A–AF APIs and semantics remain unchanged.

## Distinct capability

Candidate AF exposes only the maximum-score trajectory stratum. Candidate AG exposes later exact score strata as well. For the canonical finite witness with hidden-path masses `AA=.40`, `AB=.30`, `BA=.20`, `BB=.10`, `rankDepth=3` returns the `AA`, `AB`, and `BA` strata in order.

## Ranking contract

For a valid hidden trajectory `x_0:T` and its uniquely induced deterministic monitor trajectory `q_0:T`, Candidate AG ranks

`W(x_0:T)=mu0(x_0) l_0(x_0) product_t [A_{x_{t-1},x_t} c_t(q_{t-1},x_{t-1},x_t)]`.

`rankDepth=K` denotes the number of distinct score strata requested, not a trajectory-count cutoff. Every trajectory in every selected tie stratum is returned. If fewer than `K` score strata exist, all available strata are returned with `allRankedTrajectoriesExhausted=true`.

The production implementation operates in log space. `kBestScoreTolerance` is only a disclosed Float64 score-equality classifier. After scores are ordered from best to worse, each numerical stratum is anchored at its highest score; a later score belongs to that stratum only when the anchor-to-score difference is within the tolerance. This prevents pairwise near-equality chaining.

## Exact finite implementation

The dedicated production recurrence is a sparse ranked dynamic program over hidden/monitor states `(X_t,Q_t)`. Each reachable cell retains at most the requested number of score strata plus complete trajectory provenance for every retained tie member. Strata provably deeper than `rankDepth` may be discarded; members of a retained tie stratum may not be discarded.

Equivalent parallel concrete transitions are aggregated into the hidden-pair probability before ranking, so concrete edge identity is not decoded. Terminal hidden states use the existing implicit probability-one self-retention while monitor transitions and monitor-coupled evidence continue through the requested horizon.

## Runtime entry points

- `decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence`
- `decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates`
- `finiteRankedKBestHiddenTrajectoryDecodingResultToJson`
- `finiteRankedKBestHiddenTrajectoryConditionedDecodingResultToJson`

The dedicated request adds `rankDepth`, `kBestScoreTolerance`, and `maxReturnedKBestTrajectories`. Decoder options expose an explicit finite ranked-provenance guard. Conditioned decoding additionally uses `targetMonitorStates`.

## Compatibility and qualification

`rankDepth=1` must reduce exactly to Candidate AF, including co-MAP ambiguity, target restriction, impossibility classification, underflow behavior, parallel-transition semantics, terminal self-retention, and canonical ordering.

Qualification uses four independent perspectives: complete concrete-transition path enumeration with hidden-path aggregation, direct raw-probability hidden-path enumeration, a structurally separate dense raw-probability `X×Q` ranked dynamic program, and positive-probability underflow fixtures. Markov/HMM reductions, Candidate AE denominator consistency, tie-boundary and anchor-tolerance discriminators, relabel/order invariance, parallel split/merge, terminal behavior, resource honesty, checked serialization, and historical Candidate A–AF regression are also required.

The generated package API manifest is synchronized and verified as part of the exact-head distribution qualification so the four Candidate AG runtime entry points and their declarations remain externally discoverable.

## Honesty boundary

Positive path probabilities may underflow direct Float64 representation while finite log scores remain authoritative. Evidence, monitor-event, and joint-event impossibility never fabricate ranked paths. If complete provenance for a selected score stratum exceeds a declared finite guard, the decoder fails rather than truncating the tie, lowering `rankDepth`, switching to beam search, sampling, or another approximate method.

## Explicit exclusions

Candidate AG does not authorize beam or approximate k-best/Viterbi decoding, trajectory-count truncation that splits a tie stratum, random tie breaking, representative-only ties, posterior trajectory sampling, minimum-Bayes-risk sequence decoding, concrete parallel-edge ranking, probabilistic monitors, automatic monitor synthesis, unbounded monitor memory, evidence beyond Candidate AE, parameter learning, hard-EM/Viterbi training, iterative EM/Baum-Welch, Bayesian inference, structural state/topology optimization, Monte Carlo fallback, infinite-horizon ranked decoding, MDP/control optimization, a new Wave/Level/principal application, Showcase/EXTREP changes, or release of `QUALIFIED_SCOPE_HOLD`.
