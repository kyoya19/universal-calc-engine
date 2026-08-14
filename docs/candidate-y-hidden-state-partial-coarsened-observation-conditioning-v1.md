# Candidate Y — finite hidden-state partial/coarsened observation conditioning v1

Candidate Y adds fixed-model conditioning on hard set-valued finite observation evidence without modifying Candidate C/H/R/X request or runtime contracts.

## Mathematical contract

For a fixed finite hidden-state model `theta=(pi,A,B)` under Candidate C timing, each time step supplies a hard set `O_t` of allowed symbols from the already-declared finite alphabet. Candidate Y conditions on `Y_t in O_t` and uses the kernel-derived factor

`e_t(i) = sum_{a in O_t} B_i(a)`.

The factor is not caller-supplied soft evidence. Prefix filtering is conditioned only on evidence through the current step. Full smoothing and adjacent-state pairwise smoothing condition on the complete sequence of set-valued events. Expected transition counts sum the pairwise posterior distributions over transition indices.

## Dedicated API

Runtime entry points:

- `conditionFiniteHiddenStateOnCoarsenedObservationEvidence`
- `finiteHiddenStateCoarsenedObservationConditioningResultToJson`

The Candidate Y request contains Candidate C-compatible `initialDistribution`, `alphabet`, and `kernel`, plus `observationEvidenceSets`. Exact observations are represented as singleton sets. Candidate C/H/R/X request types remain unchanged.

## Required reductions

- all singleton sets reduce mathematically to Candidate C filtering/likelihood, Candidate H smoothing, and Candidate R pairwise smoothing/expected counts;
- fixed coarsening preimages reduce to Candidate C/H/R under the induced coarse observation kernel;
- a full-alphabet set is locally evidence-neutral;
- all-full-alphabet evidence has probability one and log likelihood zero and reduces to transition-only hidden-state propagation;
- a one-step evidence sequence has no pairwise steps and all expected transition counts are zero.

## Independent qualification

Qualification uses three independent oracle families:

1. complete enumeration of both hidden trajectories and exact underlying observation trajectories retained only when every exact observation lies in the supplied set;
2. prefix-only enumeration that excludes future evidence from filtering expectations;
3. raw-probability dense forward/backward alpha/beta calculations independent of the production log-domain recurrence.

Qualification also covers anti-representative-symbol and anti-average discriminators, future-coarsened-evidence filtering/smoothing separation, pairwise row/column consistency, expected-count conservation, set-refinement event-probability monotonicity, disjoint-union event-probability additivity, symbol-order invariance, hidden-state relabeling, observation-symbol renaming, initial/kernel/transition order invariance, parallel-transition split/merge compatibility, terminal implicit self-retention, impossible evidence honesty, underflow separation, deterministic serialization, and forged non-finite rejection.

## Failure and impossibility semantics

Malformed containers, unknown symbols, duplicate symbols, invalid tolerances, conservation failures, structural inconsistencies, and non-finite analytical values are hard failures.

An empty inner evidence set is a valid empty event and therefore returns analytical success with `possible=false`. Non-empty sets can also be mathematically impossible under the current predictive support and known kernel. Earlier prefix filters may remain reported, while full smoothing, pairwise posteriors, and expected counts are null for impossible complete evidence.

A mathematically possible event whose direct Float64 probability underflows remains `possible=true`; finite log likelihood and posterior distributions remain valid while the direct combined probability is null and underflow is diagnosed explicitly.

## Scope boundary

Candidate Y does not authorize Candidate X state-mask composition, caller-supplied soft or generic evidence factors, confidence-weighted labels, missingness/reporting-process modelling, exact-symbol imputation inside a set, unknown-kernel estimation, Candidate S/T/U/V/W parameter learning from Candidate Y posteriors, iterative EM/Baum-Welch, trajectory weights, Bayesian inference, Viterbi/MAP, continuous observations, topology/alphabet/state discovery, adaptive design, causal claims, new Wave/Level/application/Showcase, EXTREP changes, or global HOLD release.

`QUALIFIED_SCOPE_HOLD` remains in force.
