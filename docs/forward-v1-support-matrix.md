# Forward v1 support matrix and handoff map

## Purpose

This document states what the current Kiyotan-style forward engine supports, what is partial, and where the first minimal Seikatan-style reverse boundary begins.

It is grounded in the production surface exported from `packages/core/src/index.ts`. Research ideas are not marked implemented merely because they appear in roadmap documents.

## Status vocabulary

- **supported**: production implementation, public core export, and CI/test coverage exist.
- **supported with boundary**: implemented with an explicit semantic limitation callers must preserve.
- **partial**: useful production surface exists but does not constitute a general capability.
- **unsupported**: no current production contract.

## Support matrix

| Capability | Status | Current contract | Important boundary |
|---|---|---|---|
| Model definition | supported | `DefinitionModel`, parameterized variants | Explicit finite state model; no arbitrary executable model code |
| State / transition | supported | state IDs and explicit `from -> to` transitions | solver target is `transition.to`; generated targets remain diagnostics-only |
| Probability | supported with boundary | scalar, parameter ref, explicit formula tree | no symbolic algebra engine |
| Reward | supported | legacy scalar reward per transition | separate from named axes |
| Elapsed time | supported | ms / s / min / hour normalized to seconds | no general dimensional algebra |
| Expected reward | supported | iterative solver + diagnostics | convergence contract applies |
| Reachability probability | supported | explicit target-state set | generic reachability, not domain-specific “win” semantics |
| Expected elapsed time | supported | downstream transition-time expectation | divergence/non-convergence remains visible |
| Reward rate | supported with boundary | `E[reward] / E[elapsed time]` | not `E[reward / elapsed time]` |
| Named reward axes | supported with boundary | independent named axes + unit/kind metadata | no implicit netting or unit conversion |
| Parameter references | supported | finite supplied values and defaults | parameter IDs are explicit |
| Formula scalars | supported with boundary | add/subtract/multiply/divide trees | no string eval or arbitrary code |
| External input | supported | versioned JSON/unknown boundary | JSON syntax success is not type validation |
| Structured validation | supported | code/severity/path/message | additive; legacy exceptions remain |
| Solver diagnostics | supported | convergence, iterations, tolerance, delta, context | legacy defaults unchanged |
| Contribution output | supported with boundary | transition contribution rows | explanatory within a solved scenario, not automatic causal attribution |
| Scenario comparison | supported with boundary | same model, baseline/candidate, `candidate - baseline` | multi-parameter deltas are descriptive |
| One-at-a-time sensitivity | supported with boundary | one selected parameter changed per point | local counterfactual conditional on fixed baseline values |
| ObservationDataset | supported | state_count / transition_count / scalar records | evidence remains separate from parameters/results |
| Observation parsing / validation | supported | JSON/unknown parsing + model-reference checks | validation is not inference |
| Discrete reverse estimation | supported with boundary | one unknown parameter, finite candidate set, transition-count multinomial likelihood | maximum likelihood only over supplied candidates; not continuous inference |
| Reverse numeric constraint | supported with boundary | inclusive finite range for candidate admissibility | constraint is not a prior distribution |
| Relative candidate likelihood | supported with boundary | `exp(logL - maxLogL)` | likelihood ratio to best candidate; not normalized posterior probability |
| State-count likelihood | unsupported | — | state_count has no exposure semantics in the current scorer |
| Scalar-observation likelihood | unsupported | — | requires an explicit observation model |
| Multi-parameter reverse estimation | unsupported | — | current Seikatan PoC estimates exactly one parameter |
| Bayesian prior / posterior | unsupported | — | current reverse PoC is likelihood-only |
| Continuous optimization | unsupported | — | discrete candidate search only |
| JSON output | supported with boundary | structured serialization helpers | not one versioned universal schema for every historical helper |
| TeX output | partial | expected-reward and contribution helpers | not complete forward/reverse rendering |
| Report model | partial | graph/audit/generated-target boundary reports | not a unified v1 report |
| Transition effects | partial | `set_property` | richer effects require demonstrated generic need |
| State generation | partial / diagnostic | graph/state-generation helpers | generated targets are not production solver targets |
| Automatic unit conversion | unsupported | — | units are metadata outside explicit time normalization |
| Multi-parameter causal attribution | unsupported | — | requires an explicit method such as ordered marginal or Shapley-style attribution |
| GUI / web API | unsupported | — | core package boundary only |
| Large domain-specific models | unsupported as core commitments | — | digipachi / Juoh remain later applications |

## Forward mathematical boundaries

### Expectations

The engine distinguishes expected reward, reachability probability, expected elapsed time, and ratio-of-expectations reward rate.

```text
reward rate = E[reward] / E[elapsed time]
```

This is not generally equal to `E[reward / elapsed time]`.

### Iterative convergence

A valid model may return detailed solver output with:

```text
ok: true
converged: false
```

when the selected iteration limit is reached. The last approximation must not be silently treated as a converged exact result.

### Scenario and sensitivity semantics

Scenario comparison reports `candidate - baseline`.

When several parameters change, no unique causal attribution is inferred.

One-at-a-time sensitivity has the narrower counterfactual meaning:

```text
change one selected parameter
hold the other supplied baseline parameters fixed
re-evaluate the same model
```

It is not automatically a derivative, global sensitivity index, or multi-parameter causal decomposition.

## Minimal reverse-estimation boundary

The first Seikatan-style production API is:

```text
estimateDiscreteParameterFromTransitions
```

It separates:

```text
unknown parameter
fixed parameter values
candidate values
candidate constraint
ObservationDataset
likelihood
estimate over the finite candidate set
```

The current likelihood model is:

```text
transition_multinomial_complete_categories
```

For each observed origin state:

```text
log L_s(theta)
= log(N_s!)
- sum_j log(n_sj!)
+ sum_j n_sj log(p_sj(theta))
```

and total log-likelihood is summed across the scored origin-state groups.

The result is explicitly:

```text
maximum_likelihood_over_discrete_candidates
```

not a posterior and not a continuous maximum-likelihood optimizer.

### Observation boundary

The initial likelihood consumes only `transition_count` records.

For every scored origin state, every modeled outgoing destination must have an explicit transition-count observation, including explicit zero counts.

`state_count` and generic `scalar` records are still validated but are returned as ignored by this scorer because their likelihood models have not been defined.

### Zero-likelihood candidates

A positive observed count with candidate probability zero has zero likelihood. The API uses:

```text
zeroLikelihood: true
logLikelihood: null
```

rather than JSON-incompatible negative infinity or hidden epsilon smoothing.

### No Bayesian semantics

Current reverse support is:

```text
likelihood: implemented
prior: not implemented
posterior: not implemented
Bayesian update: not implemented
```

`relativeLikelihoodToBest` is a likelihood ratio, not a probability distribution.

## Compatibility boundary

The v1 and minimal reverse work remain additive:

- `DefinitionModel` remains usable;
- legacy reward remains separate from named axes;
- structured validation does not replace legacy expand/evaluate exceptions;
- diagnostic solvers do not alter legacy defaults;
- parameter/formula resolution precedes the ordinary model pipeline;
- external input rebuilds recognized structures from `unknown`;
- ObservationDataset is not converted into supplied parameters;
- forward facade/comparison/sensitivity compose existing layers;
- reverse candidate evaluation reuses existing parameter resolution and model validation;
- reverse estimation does not alter forward solver behavior.

A breaking v2 should be a deliberate compatibility decision.

## Handoff path

Read in this order:

```text
README.md
docs/forward-v1-support-matrix.md
docs/external-input.md
docs/forward-evaluation.md
docs/scenario-comparison.md
docs/parameter-sensitivity.md
docs/observations.md
docs/discrete-reverse-estimation.md
```

Representative forward entry points:

```text
prepareExternalModelInput / prepareExternalModelJson
evaluateExternalModelInput / evaluateExternalModelJson
compareExternalModelScenarios
analyzeParameterSensitivity
```

Representative reverse entry point:

```text
estimateDiscreteParameterFromTransitions
```

## Current completion judgment

The Kiyotan-style forward path remains a credible **forward v1 candidate**.

The Seikatan side has now moved from “observation boundary only” to a **minimal discrete reverse-estimation PoC** with explicit likelihood semantics.

The next reverse work should be selected by missing analytical value. High-value candidates include:

1. a versioned external reverse-request parse boundary;
2. an explicit state-count observation model if exposure semantics are defined;
3. likelihood composition for additional declared observation models;
4. multi-parameter candidate grids only after computational and interpretive limits are explicit;
5. priors/posteriors only when a genuinely Bayesian contract is introduced.

Do not call these future features implemented before their mathematics and types exist.
