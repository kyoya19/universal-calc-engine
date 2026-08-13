# Candidate U — finite hidden-state initial-distribution re-estimation v1

Authority: `ORF-ABC-HIDDEN-STATE-INITIAL-DISTRIBUTION-REESTIMATION-FOUNDATION-v1`

Operating mode: `QUALIFIED_SCOPE_HOLD`

## Scope

Candidate U adds one exact EM-style initial-distribution M-step for a finite Candidate C/H-compatible hidden-state model while keeping fixed:

- the finite hidden-state set;
- transition topology and transition probabilities;
- the finite declared observation alphabet;
- the state-conditioned categorical observation kernel;
- Candidate C observation timing and validation semantics; and
- terminal implicit-self-retention semantics.

It reuses Candidate H smoothing as the E-step authority and does not run iterative Baum-Welch.

For mathematically possible evidence `Y_0=y_0,...,Y_T=y_T`, Candidate H supplies

`gamma_0(i) = P(X_0=i | Y_0,...,Y_T)`.

Candidate U defines the expected initial-state count

`G_i = gamma_0(i)`

and performs the one-step update

`pi'_i = G_i = gamma_0(i)`.

The updated initial distribution is over the complete fixed hidden-state simplex and must sum to one within `probabilityTolerance`.

## Zero posterior initial-state mass

A state with `gamma_0(i)=0` receives `pi'_i=0`.

Candidate U does not use Candidate S/T-style zero-row retention. For mathematically possible evidence, `sum_i gamma_0(i)=1`, so the expected complete-data initial-state objective has the unique simplex optimum `pi'=gamma_0`.

## Expected complete-data objective

Candidate U maximizes

`Q(pi) = sum_i G_i log pi_i`

over the probability simplex on the fixed hidden-state set, with `0*log(0)` interpreted by its limiting value zero.

## One-step likelihood consistency

Candidate U materializes an updated observation request containing only the updated initial distribution. Transition probabilities/topology, observation alphabet, observation kernel and realized observations remain unchanged.

For mathematically possible evidence, Candidate C likelihood under the updated initial distribution must not be lower than the current-model likelihood beyond `likelihoodTolerance`.

This is one-step EM consistency only. It is not a convergence, global-optimum, parameter-recovery or structural-identification guarantee.

## Impossible evidence and Float64 underflow

A mathematically impossible complete observation sequence remains analytical success with `possible=false`. Candidate U returns no posterior or updated initial distribution because Candidate H conditioning is undefined for impossible evidence.

Direct JavaScript Float64 sequence-probability underflow remains distinct from mathematical impossibility. Finite/log-domain likelihood semantics inherited from Candidate C/H remain authoritative, and `sequenceProbabilityUnderflowed=true` is reported when applicable.

## Result contract

For possible evidence Candidate U returns, in canonical hidden-state order:

- current initial distribution;
- posterior initial-state probabilities `gamma_0`;
- updated initial distribution `pi'=gamma_0`;
- `uniqueByExpectedCounts=true`;
- original observation log likelihood;
- updated observation log likelihood;
- likelihood delta; and
- diagnostics proving that transition model, observation kernel and alphabet were not updated.

Checked JSON serialization rejects non-finite analytical values.

## Independent qualification

Production qualification must not use the production smoothing or filtering recurrence as its expected-value oracle.

### Primary oracle — complete hidden-trajectory posterior initial-state enumeration

On small finite fixtures, qualification independently enumerates every hidden-state path, computes each path's joint mass from initial, transition and emission factors under Candidate C timing, normalizes over paths matching the realized observations, and aggregates posterior mass by each path's initial hidden state.

The independently aggregated posterior initial-state distribution is the oracle M-step result.

### Secondary oracle — finite simplex objective and independent likelihood

For small state sets, qualification independently evaluates

`Q(pi) = sum_i G_i log pi_i`

on finite simplex grids including boundary points and checks that `pi'=G` attains at least the independently enumerated grid optimum within tolerance.

Current and updated realized observation likelihoods are separately recomputed by complete hidden-path enumeration without calling Candidate C production likelihood logic. The independently recomputed updated likelihood must not decrease beyond tolerance.

Qualification also covers:

- zero posterior initial mass mapping to zero updated mass;
- deterministic and one-state point-mass reductions;
- fully revealing initial observations;
- state, transition, initial-distribution, alphabet and kernel-entry ordering invariance;
- bijective observation-symbol renaming invariance;
- equivalent parallel-transition split/merge invariance;
- impossible-evidence honesty;
- direct-probability underflow separation;
- invalid tolerance rejection; and
- deterministic checked serialization/non-finite rejection.

Simulation alone is not an exact qualification oracle.

## Failure semantics

Candidate U reuses Candidate C/H validation and analytical failures and adds:

- `invalid_reestimation_tolerance`;
- `expected_initial_state_count_inconsistency`;
- `updated_initial_distribution_mass_violation`;
- `likelihood_monotonicity_violation`;
- `non_finite_reestimation_result`; and
- `internal_reestimation_inconsistency`.

Valid zero posterior initial-state probability, direct Float64 probability underflow with finite log likelihood, and mathematically impossible evidence represented as `possible=false` are not failures.

## Compatibility boundary

Candidate U is additive. It does not change Candidate C filtering/likelihood, Candidate H smoothing, Candidate R pairwise smoothing, Candidate S transition re-estimation, Candidate T observation-kernel re-estimation, finite-candidate inference, observation design, robust decision, long-run analysis, historical estimators or historical qualified entry points.

Candidate S remains transition-only learning. Candidate T remains observation-kernel-only learning. Candidate U must not silently combine S/T/U into a joint M-step, and sequential S→T→U execution is not a substitute for a separately qualified joint update.

## Explicit exclusions

Candidate U v1 does not authorize or imply:

- iterative EM or iterative Baum-Welch;
- automatic convergence loops;
- transition re-estimation within Candidate U;
- observation-kernel re-estimation within Candidate U;
- joint transition/emission/initial updating;
- sequential S/T/U chaining as a substitute for a joint M-step;
- pseudocounts, regularization, shrinkage or Bayesian priors;
- multiple independent trajectory aggregation;
- observation-alphabet or hidden-state topology discovery;
- state-number selection or hidden-state creation/deletion/merge/split;
- continuous generic or gradient optimization;
- standard errors, confidence intervals or Bayesian parameter posteriors;
- Viterbi/MAP path decoding;
- adaptive/sequential observation design;
- cyclic/general MDP optimization;
- causal initial-state interpretation;
- global structural identification or global maximum-likelihood guarantees;
- a new Wave, Level, principal application or Showcase;
- EXTREP changes; or
- release of `QUALIFIED_SCOPE_HOLD`.
