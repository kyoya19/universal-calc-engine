# Candidate V — finite hidden-state joint parameter re-estimation v1

Authority: `ORF-ABC-HIDDEN-STATE-JOINT-PARAMETER-REESTIMATION-FOUNDATION-v1`

Operating mode: `QUALIFIED_SCOPE_HOLD`

## Scope

Candidate V adds exactly one finite hidden-state joint EM-style M-step for one realized finite non-empty observation sequence. It keeps the hidden-state set, transition topology, observation alphabet, Candidate C timing and terminal implicit-self-retention semantics fixed.

The current model is `theta=(pi,A,B)`. One common current-model E-step is completed before any parameter is changed. For sequences with at least one transition, Candidate R supplies pairwise posterior information from which all required `gamma_t` marginals and expected transition counts are derived. For a one-observation sequence, Candidate H supplies `gamma_0`; transition expected counts are empty.

No Candidate S, T or U re-estimation entry point is called inside Candidate V.

## Frozen common-E-step sufficient statistics

From the single current-model E-step Candidate V fixes:

- `G_i = gamma_0(i)`;
- `Nbar_ij = sum_t xi_t(i,j)` over learnable transition times;
- `M_i(a) = sum_t gamma_t(i) 1[Y_t=a]`;
- `D_i = sum_j Nbar_ij`;
- `E_i = sum_a M_i(a)`.

No parameter block is updated before all of these statistics are fixed.

## Simultaneous M-step

Initial distribution:

`pi'_i = gamma_0(i)`.

Transition rows with `D_i > countTolerance`:

`A'_ij = Nbar_ij / D_i` over the fixed declared outgoing support. Equivalent parallel transition entries preserve their current conditional proportions inside each aggregate from/to probability.

Transition rows with `D_i <= countTolerance` retain the current row. Terminal implicit self-retention is structural and is not learned.

Observation-kernel rows with `E_i > countTolerance`:

`B'_i(a) = M_i(a) / E_i`.

Observation-kernel rows with `E_i <= countTolerance` retain the current row.

`pi'`, `A'` and `B'` are applied simultaneously to define the single updated model `theta'`.

## Sequential chaining is not Candidate V

The sequence

`S -> recompute E-step -> T -> recompute E-step -> U`

or any permutation of such blockwise calls is not the Candidate V joint M-step. Candidate V must not use an intermediate updated parameter block to generate another block's sufficient statistics during the same qualified operation.

Qualification contains an anti-sequential fixture for which the common-current-model joint result differs from sequential blockwise re-estimation.

## Joint likelihood consistency

For mathematically possible evidence, Candidate C independently evaluates the realized observation likelihood under the simultaneously updated model and request.

`log L(theta';Y) >= log L(theta;Y) - likelihoodTolerance`.

This is a one-step EM consistency condition only. It is not an iterative convergence guarantee, global optimum guarantee, identification guarantee or parameter-recovery guarantee.

## Independent qualification

Production recurrence is not the expected-value oracle.

The primary qualification oracle independently enumerates every complete hidden path on small finite fixtures. It computes path joint mass directly from initial, transition and emission factors, normalizes posterior path mass, and independently aggregates:

- every `gamma_t(i)`;
- every `Nbar_ij`;
- every `M_i(a)`.

The oracle then constructs `pi'`, `A'` and `B'` from those independently aggregated sufficient statistics and independently recomputes current and updated realized observation likelihoods by complete hidden-path enumeration.

Qualification also covers zero-departure row retention, zero-occupancy row retention, zero posterior initial mass, one-observation reduction, state/entry ordering invariance, observation-symbol bijection, equivalent parallel-transition representation, impossible-evidence honesty, direct Float64 underflow separation, invalid tolerance rejection and checked deterministic serialization.

## Compatibility boundary

Candidate C filtering/likelihood, Candidate H smoothing, Candidate R pairwise smoothing, Candidate S transition-only re-estimation, Candidate T observation-kernel-only re-estimation and Candidate U initial-distribution-only re-estimation remain unchanged and independently callable.

Candidate V does not redefine S/T/U as sequential joint learning.

## Explicit exclusions

Candidate V v1 does not authorize or imply:

- iterative EM or iterative Baum-Welch;
- automatic convergence loops;
- multiple independent trajectory aggregation;
- pseudocounts, regularization, shrinkage or Bayesian priors;
- Bayesian parameter posteriors or uncertainty intervals;
- hidden-state topology, state-number or observation-alphabet discovery;
- hidden-state creation, deletion, merge, split or label-switching resolution;
- continuous observation distributions or generic/gradient optimization;
- Viterbi/MAP trajectory decoding;
- adaptive/sequential observation design;
- cyclic/general MDP optimization;
- causal interpretation;
- global structural identification or global maximum-likelihood guarantees;
- a new Wave, Level, principal application or Showcase;
- EXTREP changes; or
- release of `QUALIFIED_SCOPE_HOLD`.
