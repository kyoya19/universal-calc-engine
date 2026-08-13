# Candidate G — finite first-passage candidate inference v1

## Status and scope

This document defines the targeted Public contract authorized by `ORF-ABC-FIRST-PASSAGE-FINITE-CANDIDATE-INFERENCE-FOUNDATION-v1`.

Candidate G adds a domain-independent Seikatan operation over a finite caller-supplied family of fixed stochastic candidates. One shared first-passage observation is evaluated under every candidate, mathematically possible candidates are ranked by finite log likelihood, and the complete maximum-likelihood set is returned.

This is a targeted additive capability. It does not release `QUALIFIED_SCOPE_HOLD`, replace the historical project-wide qualified subject, rewrite prior Wave/Level/Gate evidence, or authorize a new principal application or Showcase.

## Public API

Runtime exports:

- `inferFiniteFirstPassageCandidates`
- `finiteFirstPassageCandidateInferenceResultToJson`

The request contains:

- a finite non-empty `candidates` array;
- one `observation` of exactly one supported kind.

Each candidate contains:

- unique non-empty `candidateId`;
- fixed finite `DefinitionModel`;
- Candidate-A-compatible `initialDistribution`;
- finite non-empty unique `targetStates`;
- optional JSON-scalar `value` (`string | number | boolean | null`).

Candidate-specific target-state IDs may differ. The caller declares that each candidate target set represents the same external event meaning. Core does not infer semantic equivalence between differently named states.

## Supported observation contract

Exactly one of the following is supplied.

### Exact first hit

`{ kind: 'exact_hit_at_step', step: t }`

For candidate `i`, with first-passage time

`tau_i = inf { k >= 0 : X_k is in T_i }`,

the likelihood is

`L_i = P_i(tau_i = t)`.

Step zero follows Candidate B semantics. Initial mass already in the target set contributes to `P_i(tau_i = 0)`.

### Right-censored finite horizon

`{ kind: 'not_hit_by_horizon', horizon: H }`

The likelihood is

`L_i = P_i(tau_i > H)`.

At `H = 0`, this is the initial non-target probability mass.

The v1 request does not combine both observation kinds and does not represent repeated samples, interval censoring, left censoring, noisy timestamps, observed target identity, competing risks, or joint hidden-observation evidence.

## Stable log-likelihood semantics

Candidate B exposes finite-horizon first-passage probability values in JavaScript `number`. Candidate G must not infer mathematical impossibility merely because an extremely small representable event probability underflows to `0`.

Production therefore evaluates the first-passage event in log space using killed non-target probability mass:

- target mass is removed after its first entry;
- non-target terminal states use the existing implicit self-retention semantics;
- positive transition contributions are accumulated with log-sum-exp;
- exact-hit likelihood uses target boundary flux at the declared step;
- right-censored likelihood uses survivor mass after the declared horizon.

For a mathematically possible candidate, `logLikelihood` is finite. `eventProbability` is `exp(logLikelihood)` and may equal `0` because of float64 underflow. In that case:

- `possible` remains `true`;
- `eventProbabilityUnderflowed` is `true`;
- ranking continues to use `logLikelihood`.

A mathematically impossible event has no finite log likelihood and is represented with `possible: false`, `logLikelihood: null`, and `eventProbability: null`.

## Maximum-likelihood selection and ambiguity

Let `ell_i` be the finite log likelihood of every possible candidate and

`ell* = max_i ell_i`.

A candidate belongs to the selected set when

`abs(ell_i - ell*) <= comparisonTolerance`.

The default comparison tolerance is `1e-12`.

Classification is one of:

- `unique_maximum_likelihood` — exactly one selected candidate;
- `tied_maximum_likelihood` — multiple selected candidates;
- `all_candidates_impossible` — no candidate can produce the observed event.

Candidate input order and candidate ID lexical order never break a likelihood tie. The selected set is returned in deterministic candidate-ID order.

`all_candidates_impossible` is an analytical success classification. Candidate G does not fabricate a winner.

## Candidate value bridge

An optional caller-supplied JSON-scalar `value` is preserved in each candidate evaluation and selected candidate record. This permits the selected candidate or tied candidate set to feed existing Kiyotan composition without changing existing Kiyotan reward, time, reachability, contribution, sensitivity, scenario, or decision contracts.

Candidate G itself does not execute a domain objective.

## Validation and failure semantics

The request fails explicitly for, among other cases:

- invalid option values;
- empty candidate family;
- empty or duplicate candidate IDs;
- candidate count above `maxCandidates`;
- non-JSON-scalar or non-finite numeric candidate value;
- malformed observation kind;
- negative/non-integer step or horizon;
- observation horizon above `maxHorizon`;
- any candidate-specific Candidate B validation failure;
- non-finite analytical corruption;
- non-finite serialization payloads.

Candidate-specific model, initial-distribution, target-set, transition and terminal validation remains governed by Candidate B and the existing model validation contract. Invalid candidates are not silently dropped from the family.

Defaults:

- `probabilityTolerance = 1e-9`
- `comparisonTolerance = 1e-12`
- `maxCandidates = 1000`
- `maxHorizon = 10000`

No input distribution is silently normalized.

## Diagnostics

Successful results disclose that:

- method is `finite_candidate_first_passage_log_likelihood_comparison`;
- stable likelihood method is `log_domain_killed_probability_mass`;
- numeric representation is JavaScript float64;
- simulation is not used;
- ranking basis is finite log likelihood;
- no candidate prior is used;
- no posterior normalization or posterior candidate probability is computed;
- no infinite-horizon claim is made;
- no global model-identification claim is made;
- candidate order does not affect selection.

## Independent qualification oracles

Production results are qualified against independently implemented test logic rather than treating production Candidate G recurrence as its own oracle.

Primary oracle:

- complete finite path enumeration on small fixtures;
- each path is assigned exactly once to its earliest target entry or the not-hit-by-horizon remainder;
- candidate event probabilities are independently ranked.

Secondary oracle:

- independently constructed dense killed-chain transition matrix;
- target transitions are removed only inside the oracle;
- exact-hit probability is recovered from target boundary flux;
- censored probability is recovered from remaining non-target mass.

Additional analytical oracle:

- deterministic/geometric closed forms;
- a long-horizon geometric fixture where direct probabilities underflow to zero while the finite closed-form log likelihood still determines the correct ranking.

Metamorphic qualification includes candidate-order invariance, state/transition/target ordering invariance, parallel-transition split equivalence, tied-candidate preservation, candidate-internal target-state renaming under the same declared event meaning, step-zero semantics, and underflow-safe ranking.

## Compatibility boundary

Candidate G does not change:

- Candidate A initial/state-distribution semantics;
- Candidate B first-passage PMF/CDF/survival API or meaning;
- Candidate C hidden-state filtering;
- Candidate D finite-family distinguishability boundary;
- Candidate F hidden-observation finite-candidate inference;
- existing directly observed Seikatan likelihood APIs;
- DefinitionModel;
- historical reward/time/reachability/contribution/sensitivity/scenario/decision semantics.

Targets used by Candidate G are first-entry bookkeeping targets only. They are not globally mutated into terminal or absorbing states.

## Explicit non-claims and exclusions

Candidate G does not qualify or imply:

- Bayesian candidate posterior probabilities or candidate priors;
- Bayes factors as a separately qualified inference family;
- continuous parameter fitting or optimisation;
- automatic candidate/model-family generation;
- unknown transition learning outside the supplied finite family;
- infinite-horizon/eventual absorption inference;
- infinite-horizon expected absorption time;
- stationary, limiting, or quasi-stationary distributions;
- continuous-time or continuous-state first-passage inference;
- repeated passage-time samples;
- interval or left censoring;
- noisy/uncertain timestamps;
- observed target identity or competing-risks inference;
- joint hidden-observation and first-passage likelihood;
- smoothing or Viterbi inference;
- global structural identifiability;
- causal validity;
- automatic experiment design;
- cyclic policy optimisation, arbitrary MDP optimisation, or optimal stopping;
- a new principal application/domain, Showcase, Wave 4, Level 9, ORF-30, or ORF-40.

Maximum-likelihood uniqueness means only uniqueness inside the supplied finite candidate family, supplied event mappings, one declared observation, and disclosed comparison tolerance. It does not establish that the winning candidate is the true real-world model.
