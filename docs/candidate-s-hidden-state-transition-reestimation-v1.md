# Candidate S — finite hidden-state transition re-estimation v1

Authority: `ORF-ABC-HIDDEN-STATE-TRANSITION-REESTIMATION-FOUNDATION-v1`

## Scope

Candidate S extends Candidate R posterior expected transition counts into one exact EM-style transition M-step under the same finite hidden-state model, fixed initial distribution, known observation kernel, observation timing, validation rules, and terminal implicit-self-retention semantics.

It does not run an iterative Baum-Welch loop.

For each nonterminal state `i`, Candidate R supplies posterior expected transition counts

`Nbar_ij = E[N_ij | Y_0,...,Y_T]`.

Let

`D_i = sum_j Nbar_ij`

over the fixed allowed outgoing transition destinations of state `i`.

When `D_i` is greater than `countTolerance`, Candidate S performs the row M-step

`q_ij = Nbar_ij / D_i`.

No new transition destination is created.

## Zero expected-departure rows

When `D_i <= countTolerance`, the expected complete-data transition objective is flat for that row. Candidate S does not invent a uniform row or claim unique identification. It retains the supplied current row exactly and marks the row as `retained_zero_expected_departure` with `uniqueByExpectedCounts=false`.

## Terminal states

Candidate C/H/R terminal semantics remain authoritative. Terminal states use structural implicit self-retention. Candidate S reports that row as `structural_terminal_self_retention` and does not learn or alter it.

## Parallel transitions

The learned object is the aggregate hidden-state destination probability for each `from -> to` pair. When the source `DefinitionModel` contains multiple explicit transitions with the same `from` and `to`, Candidate S preserves their current conditional proportions while changing only the aggregate destination probability used by the hidden-state model. This prevents the one-step update from silently altering reward/time/effect mixtures within the same hidden-state destination.

## Likelihood consistency

Candidate S internally materializes the one-step updated transition model while keeping the initial distribution and observation kernel fixed. It recomputes the realized observation-sequence likelihood under Candidate C semantics.

For mathematically possible evidence, the updated log likelihood must not be below the current log likelihood by more than `likelihoodTolerance`.

This is a one-step EM consistency check only. It is not a convergence, global-optimum, parameter-recovery, or structural-identification guarantee.

## Impossible evidence

A mathematically impossible observation sequence remains analytical success with `possible=false`. Candidate S does not fabricate transition estimates, rows or updated likelihood values.

Direct Float64 probability underflow remains distinct from mathematical impossibility; Candidate C/H/R log-domain semantics remain authoritative.

## Independent qualification

Primary oracle: complete hidden-path enumeration. The qualification independently enumerates all hidden trajectories, computes normalized posterior path mass, aggregates posterior expected transition counts, and independently row-normalizes those counts.

Secondary oracle: expected complete-data row objective. On small finite rows, qualification independently evaluates

`Q_i(q_i) = sum_j Nbar_ij log q_ij`

on closed-form fixtures and finite simplex grids, including boundary points. Complete hidden-path enumeration independently recomputes current and updated realized evidence likelihood for the one-step non-decrease check.

Qualification also covers fully revealed empirical-frequency reduction, zero-departure retention, terminal structural retention, one-state self-loop reduction, state/transition/kernel/input order invariance, equivalent parallel-transition split/merge invariance, explicit zero-probability allowed edges, impossible-evidence honesty, underflow separation, tolerance failures, and checked deterministic serialization.

## Explicit exclusions

Candidate S v1 does not authorize or imply:

- iterative EM or iterative Baum-Welch;
- automatic convergence loops or stopping criteria;
- observation-kernel re-estimation;
- initial-distribution re-estimation;
- joint transition-and-emission updates;
- pseudocounts, regularization, shrinkage or Bayesian priors;
- transition-topology discovery;
- hidden-state creation, deletion, merge or split;
- label-switching resolution;
- multiple independent trajectory aggregation;
- generic continuous or gradient optimization;
- standard errors or confidence intervals;
- Bayesian parameter posterior inference;
- Viterbi/MAP trajectory decoding;
- adaptive/sequential observation design;
- cyclic/general MDP optimization;
- causal transition interpretation;
- global structural identification or global maximum-likelihood guarantees;
- a new Wave, Level, principal application or Showcase;
- EXTREP changes;
- release of `QUALIFIED_SCOPE_HOLD`.
