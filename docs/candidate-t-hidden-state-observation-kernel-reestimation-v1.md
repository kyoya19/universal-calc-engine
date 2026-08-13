# Candidate T — finite hidden-state observation-kernel re-estimation v1

Authority: `ORF-ABC-HIDDEN-STATE-OBSERVATION-KERNEL-REESTIMATION-FOUNDATION-v1`

Operating mode: `QUALIFIED_SCOPE_HOLD`

## Scope

Candidate T adds one exact EM-style categorical observation-kernel M-step for a finite hidden-state model while keeping fixed:

- the finite hidden-state set;
- transition topology and transition probabilities;
- the initial distribution;
- the finite declared observation alphabet;
- Candidate C observation timing and validation semantics; and
- terminal implicit-self-retention semantics.

It reuses Candidate H smoothed hidden-state posterior marginals as the E-step sufficient statistics. It does not run an iterative Baum-Welch loop.

For a mathematically possible realized observation sequence `Y_0=y_0,...,Y_T=y_T`, Candidate H supplies

`gamma_t(i) = P(X_t=i | Y_0,...,Y_T)`.

For hidden state `i` and declared observation symbol `a`, define posterior expected emission count

`M_i(a) = sum_t gamma_t(i) * 1[y_t=a]`

and expected state occupancy

`E_i = sum_a M_i(a) = sum_t gamma_t(i)`.

## Positive expected occupancy

When `E_i` is greater than the disclosed `countTolerance`, Candidate T updates the full categorical row on the fixed declared alphabet by

`b'_i(a) = M_i(a) / E_i`.

The updated row must sum to one within `probabilityTolerance`. No symbol may be created, removed or renamed. A declared symbol with zero posterior expected count receives zero updated probability.

The row is reported as `updated_positive_expected_occupancy` with `uniqueByExpectedCounts=true`.

## Zero expected occupancy

When `E_i <= countTolerance`, the expected complete-data emission objective is flat for that hidden state. Candidate T does not invent a uniform row or claim unique identification.

The supplied current observation-kernel row is retained exactly and reported as `retained_zero_expected_occupancy` with `uniqueByExpectedCounts=false`.

This is a valid no-information result, not an analytical failure.

## Expected complete-data objective

For each positive-occupancy hidden state, the M-step maximizes

`Q_i(b_i) = sum_a M_i(a) log b_i(a)`

over the categorical probability simplex on the fixed declared observation alphabet, with `0*log(0)` interpreted by its limiting value zero.

## One-step likelihood consistency

Candidate T materializes an updated observation request containing the learned categorical kernel while preserving the model, initial distribution, alphabet and realized observations.

For mathematically possible evidence, Candidate C likelihood under the updated observation kernel must not be lower than the current-model likelihood beyond the disclosed `likelihoodTolerance`.

This is one-step EM consistency only. It is not a convergence, global-optimum, parameter-recovery or structural-identification guarantee.

## Impossible evidence

A mathematically impossible complete observation sequence remains analytical success with `possible=false`.

Candidate H smoothing is undefined for conditioning on impossible complete evidence, so Candidate T returns no re-estimated rows and does not fabricate an observation kernel.

## Float64 underflow

Direct JavaScript Float64 sequence-probability underflow remains distinct from mathematical impossibility.

When Candidate C/H retain a finite log likelihood for a mathematically possible sequence while direct sequence probability underflows, Candidate T continues with the scaled/log-domain posterior semantics and reports `sequenceProbabilityUnderflowed=true` in diagnostics.

## Result contract

For possible evidence Candidate T returns, in canonical hidden-state and observation-symbol order:

- current observation-kernel rows;
- updated observation-kernel rows;
- per-state expected occupancy;
- per-state/per-symbol posterior expected emission counts;
- row status;
- `uniqueByExpectedCounts`;
- original observation log likelihood;
- updated observation log likelihood;
- likelihood delta; and
- diagnostics proving that transition probabilities/topology, initial distribution and observation alphabet were not updated.

Checked JSON serialization rejects non-finite analytical values.

## Independent qualification

Production qualification must not use the production smoothing/M-step recurrence as its expected-value oracle.

### Primary oracle — complete hidden-trajectory posterior emission counts

On small finite fixtures, qualification independently enumerates every hidden-state path and computes each path's joint mass from:

- initial probability;
- transition probability, including terminal implicit self-retention; and
- state-conditioned emission probability under Candidate C timing.

It then independently:

1. normalizes posterior path mass over all paths consistent with the realized observation sequence;
2. reconstructs every per-step smoothed hidden-state marginal;
3. aggregates posterior expected state-by-symbol emission counts;
4. derives expected state occupancy; and
5. row-normalizes positive-occupancy states or retains the supplied current row for zero-occupancy states.

### Secondary oracle — categorical-simplex objective and independent likelihood

For small categorical rows, qualification independently evaluates

`Q_i(b_i) = sum_a M_i(a) log b_i(a)`

on finite simplex grids including boundary points and checks that the production row attains at least the independently enumerated grid optimum within tolerance.

Current and updated realized observation likelihoods are separately recomputed by complete hidden-path enumeration without calling Candidate C production likelihood logic. The independently recomputed updated likelihood must not decrease beyond tolerance.

### Required reductions and metamorphic checks

Qualification covers:

- independent reconstruction of Candidate H smoothing marginals before the M-step;
- positive-occupancy normalized expected-count rows;
- zero-occupancy retained-row/non-unique semantics;
- row mass conservation;
- fixed-alphabet support;
- deterministically known hidden-path empirical per-state observation frequencies;
- one-state empirical observation frequencies;
- fully revealing categorical emissions;
- one-step realized likelihood non-decrease;
- hidden-state ordering invariance;
- transition-entry ordering invariance;
- initial-distribution ordering invariance;
- observation-alphabet/kernel-entry ordering invariance;
- bijective observation-symbol renaming invariance;
- equivalent parallel-transition split/merge invariance;
- impossible-evidence honesty;
- direct-probability underflow separation; and
- deterministic checked serialization/non-finite rejection.

Simulation alone is not an exact qualification oracle.

## Failure semantics

Candidate T reuses Candidate C/H validation and analytical failures and adds:

- `invalid_reestimation_tolerance`;
- `expected_emission_count_inconsistency`;
- `updated_observation_kernel_row_mass_violation`;
- `likelihood_monotonicity_violation`;
- `non_finite_reestimation_result`; and
- `internal_reestimation_inconsistency`.

The following are not failures:

- a valid hidden state with zero posterior expected occupancy when its current kernel row is retained;
- a valid zero updated probability for a declared observation symbol;
- direct Float64 sequence-probability underflow with finite log likelihood; or
- mathematically impossible evidence represented as `possible=false`.

## Compatibility boundary

Candidate T is additive. It does not change Candidate C filtering/likelihood, Candidate H smoothing, Candidate R pairwise smoothing, Candidate S transition re-estimation, finite-candidate inference, observation design, robust decision, long-run analysis, historical estimators or historical qualified entry points.

Candidate S remains transition-only learning. Candidate T must not silently widen Candidate S into joint transition/emission updating.

## Explicit exclusions

Candidate T v1 does not authorize or imply:

- iterative EM or iterative Baum-Welch;
- automatic convergence loops or stopping criteria;
- transition re-estimation;
- initial-distribution re-estimation;
- joint transition/emission or transition/emission/initial updates;
- pseudocounts, regularization, shrinkage or Bayesian priors;
- observation-alphabet discovery or expansion;
- hidden-state topology discovery;
- state-number selection;
- hidden-state creation, deletion, merge or split;
- label-switching resolution;
- multiple independent trajectory aggregation;
- continuous observation distributions;
- generic continuous or gradient optimization;
- standard errors or confidence intervals;
- Bayesian parameter posterior inference;
- Viterbi/MAP path decoding;
- adaptive/sequential observation design;
- cyclic/general MDP optimization;
- causal emission interpretation;
- global structural identification;
- global maximum-likelihood guarantees;
- a new Wave, Level, principal application or Showcase;
- EXTREP changes; or
- release of `QUALIFIED_SCOPE_HOLD`.
