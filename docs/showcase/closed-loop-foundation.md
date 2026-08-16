# ORF Closed-Loop Foundation Showcase — Technical Provenance

## Status and authority boundary

This document describes the implementation artifact authorized by `ORF-SHOWCASE-CLOSED-LOOP-FOUNDATION-IMPLEMENTATION-v1`.

It is Showcase composition only. It does not define a new analytical capability, Candidate, API, Wave, Level, principal application, promotion state, npm release, or HOLD transition.

Analytical control remains:

- `CURRENT_SCOPE_QUALIFICATION_COMPLETE_WITH_CHANGE_CONTROL`
- `QUALIFIED_SCOPE_HOLD`
- `globalHoldReleased=false`
- `fullWaveRerunRequired=false`

## Exact analytical baseline

The Showcase is composed against the already-qualified Public analytical subject:

- subject: `subject-public-8b341032516a`
- commit: `8b341032516a2f5108170743c4dafd8fde31a229`

The later Public commit containing these example/documentation files is an implementation/presentation commit. Private Showcase qualification evidence records that commit separately from the analytical baseline.

## Public-only reproduction

The runtime path is deliberately Public-only:

1. install the repository's locked development dependencies;
2. build the existing core source tree into `dist/`;
3. execute `examples/showcase/closed-loop-foundation/runner.mjs --verify`.

The runner imports only existing exports from `dist/index.js`. It has no Private research repository dependency and adds no package/runtime dependency.

The current verified npm distribution `universal-calc-engine@1.1.0` contains the qualified root API surface used by the Showcase. The repository reproduction path remains appropriate because the Showcase fixture, runner, and independently fixed expected result are repository example artifacts rather than files shipped in the npm package.

## Primary lane: Seikatan to Kiyotan

The primary deterministic fixture uses a two-state finite model, one realized categorical sequence, fixed monitor dynamics, fixed initial calibrated evidence, and fixed monitor-coupled transition evidence.

The exact API composition is:

1. `reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories` — Candidate AJ
2. `propagateFiniteHorizonStateDistribution` — Candidate A
3. `analyzeFiniteHorizonFirstPassage` — Candidate B
4. `analyzeFiniteMarkovLongRunBehavior` — Candidate J
5. `analyzeFiniteAdditiveTrajectoryFunctionalDistribution` — Candidate AA
6. `analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence` and `conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue` — Candidate AB

### Closed-loop handoff rule

The runner constructs the downstream finite model exclusively from Candidate AJ's returned `finalTheta.transitionRows` and uses Candidate AJ's returned `finalTheta.initialDistribution` as the downstream initial distribution.

The original fixture transition probabilities are used only as AJ's initial model. They are not re-injected after AJ returns.

The fixture contains no separate hidden truth parameter. Consequently the implementation check is stronger than a comment-level declaration: there is no truth field available for a post-learning substitution path.

### Convergence honesty

The fixture sets `maxIterations=2`. Independent complete hidden-path calculations fix the expected AJ status as:

- possible: `true`
- converged: `false`
- stop reason: `MAX_ITERATIONS_REACHED`
- accepted iterations: `2`

Expected total log likelihoods are:

| Iteration | Current | Updated | Delta |
| --- | ---: | ---: | ---: |
| 1 | -4.3637311755264045 | -4.03756223718723 | 0.32616893833917437 |
| 2 | -4.03756223718723 | -3.8868675787022307 | 0.15069465848499952 |

The Showcase does not convert this bounded stop into a convergence claim. Downstream computation is explicitly labeled as using a bounded non-converged estimate.

### Downstream outputs

The Kiyotan portion applies the returned AJ model to a three-step horizon. The additive functional counts destination-state `b` occurrences over the three transition steps. Candidate AB applies a second, separately declared sequence of state-local calibrated evidence likelihoods to that same additive functional.

The runner exposes:

- final three-step state distribution;
- first-passage probability to `b` through step 3 and the per-step first-hit trace;
- finite-chain global stationary distribution when unique and Cesàro long-run occupancy;
- unconditional additive count distribution over values 0–3;
- evidence probability and evidence-conditioned additive count distribution;
- the conditional probability for exact additive value `2`.

The AJ evidence and downstream AB evidence are separate declared inputs. The Showcase does not merge their semantics or imply that one is a posterior for the other.

## Secondary lane: ambiguity without fabricated recovery

The secondary fixture supplies two finite models named `candidate-high` and `candidate-low`.

Both have a one-symbol observation kernel with probability one in every state. Under the supplied observation sequence, existing finite candidate inference therefore returns an exact maximum-likelihood tie.

Candidate D-compatible classification then evaluates one explicitly declared probe: the `s1 -> s1` transition probability. Both candidates have value `0.5` for that probe, so the family is `fully_unresolved_within_tolerance` under this finite observation design.

No transitive/global structural-identifiability claim is made. The classification is only about the supplied finite family, probe set, and tolerance.

The two unresolved candidates are then evaluated independently with Candidate A for one step:

- `candidate-high`: `P(s1)=0.8`
- `candidate-low`: `P(s1)=0.2`

This makes predictive recovery candidate-dependent even though parameter/model recovery remains unresolved.

Two supplied pure actions are evaluated:

- `state-linked`: reward 0 in `s0`, 10 in `s1`; candidate values 8 and 2;
- `safe`: reward 4 in both states; candidate value 4 under both models.

Candidate M therefore selects `safe` by finite maximin expected reward. The unresolved candidate set remains intact throughout; no candidate prior, posterior weighting, averaging, or invented truth is used.

The output deliberately separates four claims:

1. parameter recovery: unresolved;
2. predictive recovery: candidate-dependent;
3. ambiguity preservation: preserved;
4. decision robustness: unique maximin over the supplied pure actions.

## Independent expected-result construction

`expected-result.json` was fixed from calculations structurally independent of the runner orchestration:

- Candidate AJ: complete enumeration of all finite hidden paths, followed by simultaneous finite expected-count re-estimation for each accepted iteration;
- Candidate A: direct dense finite probability propagation;
- Candidate B: survivor-mass/first-entry arithmetic;
- Candidate J: direct two-state stationary equations;
- Candidate AA: complete four-state-time-path enumeration with exact integer count aggregation;
- Candidate AB: complete path enumeration with multiplicative declared local evidence factors and direct conditioning;
- secondary prediction: one-step closed form;
- Candidate M: direct minimum-by-candidate then maximum-by-action comparison.

The runner never writes or regenerates the expected file. `--verify` compares its produced result against that independently fixed artifact using numeric tolerance `1e-10` scaled by `max(1, |expected|, |actual|)` and exact comparison for nonnumeric structure.

## Regression role

The repository regression test re-executes the same semantic composition from source exports and checks:

- AJ bounded non-convergence status and trace;
- AJ `finalTheta` direct downstream model construction;
- A/B/J/AA/AB principal outputs;
- finite-candidate tie and Candidate D unresolved classification;
- distinct per-candidate predictions;
- Candidate M `safe` maximin selection;
- no candidate averaging/invented truth path in the Showcase orchestration.

CI additionally builds `dist/` and runs the Public executable with `--verify`, so third-party reproduction is checked against the same built root API surface used by the example.

## Showcase-specific gap disposition

At the time the Showcase implementation was first qualified, the recorded disposition was:

- `C-SHOW-001` — closed: executable closed-loop orchestration/example exists;
- `C-SHOW-002` — closed: current foundation capability is explained through README, structured output, fixture, expected result, and this technical provenance document;
- `C-SHOW-003` — then remained open because published npm `universal-calc-engine@1.0.0` predated the current Candidate A-through-AJ root APIs.

That historical implementation-time record is not rewritten.

The current-generation distribution subsequently closed the remaining distribution gap. Current status is:

```text
C-SHOW-003:
CLOSED_BY_VERIFIED_CURRENT_GENERATION_NPM_DISTRIBUTION

current package:
universal-calc-engine@1.1.0
```

This closure is a distribution/onboarding fact. It does not create a generalized analytical capability or change the Showcase expected-result commitment.

## Claim boundary

Allowed Showcase-level descriptions include:

- exact computation within a declared finite explicit probabilistic model and qualified contract;
- finite candidate inference;
- qualified finite parameter re-estimation;
- convergence-controlled iterative re-estimation with explicit stop status;
- finite hidden-state filtering/smoothing/conditioning within qualified contracts represented by the composed APIs;
- finite candidate-family distinguishability under a declared finite design and tolerance;
- finite maximin robust decision over supplied pure actions;
- ambiguity preservation.

This implementation does not claim:

- arbitrary real-world exact prediction;
- arbitrary continuous inference;
- general structural identifiability;
- Bayesian posterior inference or Bayesian learning;
- causal inference or causal effects;
- general cyclic policy optimization or arbitrary MDP optimization;
- global optimality;
- guaranteed truth recovery;
- guaranteed convergence;
- literal mathematical universality.

“万能計算機” remains a project concept/name, not a scope-free solver statement.

## Distribution distinction

Current verified public package:

```text
universal-calc-engine@1.1.0
```

Current-generation package tag target:

```text
package-v1.1.0
76e7ace7e06ab33753d573b7e6d42abc717c178f
```

Package `1.1.0` contains the qualified current root API surface used by the Showcase. Its package-name consumer path is documented in [Current-generation consumer quickstart](../current-generation-consumer-quickstart.md).

Historical immutable public package:

```text
universal-calc-engine@1.0.0
```

Canonical historical release target:

```text
bddff4fcc4f744c8b5e9ac7868a6ca40e7163e47
```

Package `1.0.0` predates the current Candidate A-through-AJ surface. That historical fact explains the original implementation-time C-SHOW-003 state but must not be projected onto package `1.1.0`.
