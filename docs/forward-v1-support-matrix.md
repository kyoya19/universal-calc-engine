# Forward v1 support matrix and handoff map

## Purpose

This document states what the current Kiyotan-style forward engine supports as a v1 candidate, what is only partially supported, and what remains outside the current contract.

It is based on the implementation currently exported from `packages/core/src/index.ts`. It is not a roadmap promise and it does not treat research ideas as implemented features.

## Status vocabulary

- **supported**: implemented in production code, exposed through the public core surface, and covered by the current CI/test suite.
- **supported with boundary**: implemented, but with an explicit semantic or scope limitation that callers must preserve.
- **partial**: useful implementation exists, but it is not a complete v1-wide output or modelling contract.
- **unsupported**: not implemented as a production capability and must not be inferred from adjacent helpers.

## Support matrix

| Capability | Status | Current contract | Important boundary |
|---|---|---|---|
| Model definition | supported | `DefinitionModel`, parameterized variants | Explicit finite state model; no arbitrary executable model code |
| State / transition | supported | explicit state IDs and explicit `from -> to` transitions | solver target remains `transition.to`; generated targets are diagnostics-only |
| Probability | supported with boundary | scalar, parameter reference, explicit formula tree after resolution | validated as finite probabilities and outgoing totals; no symbolic algebra engine |
| Reward | supported | legacy scalar reward per transition | legacy reward is one scalar axis and remains separate from named axes |
| Elapsed time | supported | milliseconds / seconds / minutes / hours, normalized to seconds | descriptive units only; no general dimensional algebra |
| Expected reward | supported | iterative forward solver plus diagnostics | iterative convergence contract applies |
| Reachability probability | supported | explicit target-state set | generic reachability, not a domain-specific “win” semantic |
| Expected elapsed time | supported | downstream transition time expectation | divergent/non-convergent models remain visible through diagnostics |
| Reward rate | supported with boundary | `E[reward] / E[elapsed time]` | explicitly not `E[reward / elapsed time]` |
| Named reward axes | supported with boundary | independent named benefit/cost/neutral axes with unit metadata | axes are never implicitly netted or converted |
| Parameter references | supported | declared numeric parameters with optional defaults | supplied values must be finite; parameter IDs are explicit |
| Formula scalars | supported with boundary | add / subtract / multiply / divide expression trees | no string `eval`, no arbitrary code, no symbolic simplification |
| External input | supported | versioned JSON/unknown document boundary for base and reward-axis models | successful `JSON.parse` is not treated as type validation |
| Input failure stages | supported | JSON syntax, shape, parameter resolution, model validation | stages remain distinct and machine-readable where implemented |
| Structured validation | supported | `code / severity / path / message` issues | additive API; legacy expand/evaluate exception contracts remain |
| Solver diagnostics | supported | convergence, iterations, tolerance, last max delta, context | legacy solver defaults and exception contracts remain unchanged |
| Contribution output | supported with boundary | transition contribution rows within a solved scenario | explains solved transition contributions; not automatically causal attribution |
| Scenario comparison | supported with boundary | same model, baseline vs candidate parameters, `candidate - baseline` deltas | multi-parameter difference is descriptive, not a unique causal decomposition |
| One-at-a-time sensitivity | supported with boundary | one selected parameter changed per candidate point | counterfactual is conditional on other supplied baseline parameters being fixed |
| ObservationDataset | supported as input boundary | `state_count`, `transition_count`, generic scalar observations | observations are evidence, not parameters or solver results |
| Observation parsing / validation | supported | JSON/unknown parsing plus model-linked state/transition checks | no likelihood or inference is implied by validation |
| JSON output | supported with boundary | serialization helpers for current structured results | not a versioned universal wire schema for every historical helper |
| TeX output | partial | expected-reward and contribution TeX helpers | not yet a complete TeX rendering of forward facade/scenario/sensitivity results |
| Report model | partial | state graph, probability audit and generated-target boundary reports | not yet a unified report for the integrated forward-v1 result |
| Transition effects | partial | `set_property` | richer mutations/actions are not part of v1 without a demonstrated generic use case |
| State generation | partial / diagnostic | graph/state-generation helpers exist | generated transition targets are not used by the production solver path |
| Automatic unit conversion | unsupported | — | named-axis units are metadata; unrelated units are not converted or checked dimensionally |
| Multi-parameter causal attribution | unsupported | — | requires an explicit method such as ordered marginal or Shapley-style attribution |
| Reverse estimation / Seikatan | unsupported at this v1 boundary | ObservationDataset exists as preparation | no production likelihood, candidate ranking, prior, posterior or estimate contract yet |
| Bayesian prior / posterior | unsupported | — | must not be inferred from parameter sensitivity or scenario comparison |
| GUI / web API | unsupported | — | core package boundary only |
| Domain-specific large models | unsupported as core commitments | — | digipachi / Juoh etc. remain representative later applications, not core semantics |

## Mathematical boundaries

### Expectations

The engine distinguishes:

- expected reward,
- reachability probability,
- expected elapsed time,
- ratio-of-expectations reward rate.

The reward-rate contract is:

```text
E[reward] / E[elapsed time]
```

and is not equivalent in general to:

```text
E[reward / elapsed time]
```

### Iterative solvers

Forward solvers expose convergence diagnostics. A structurally valid model may therefore produce a detailed result with:

```text
ok: true
converged: false
```

when the configured iteration limit is reached. Such a result contains the last approximation and must not be silently treated as an exact converged value.

### Scenario differences

Scenario comparison reports:

```text
candidate - baseline
```

for supported outputs. When more than one parameter changes, that difference is not assigned to unique causes.

Contribution-row differences are explicitly descriptive differences between already-solved contribution structures.

### One-at-a-time sensitivity

One-at-a-time sensitivity has a clearer counterfactual interpretation:

```text
change selected parameter
hold other supplied baseline parameters fixed
re-evaluate the same model
```

This is still local to the chosen baseline and candidate values. It is not a derivative, global sensitivity index, or multi-parameter causal decomposition unless a later API explicitly defines such a method.

## Compatibility boundary

Forward v1 is additive over the historical lower-level APIs.

The following compatibility decisions are intentional:

- existing `DefinitionModel` remains usable;
- legacy scalar `reward` remains separate from named reward axes;
- structured validation does not replace existing expand/evaluate exception behavior;
- diagnostic solver variants do not silently change legacy solver defaults;
- parameter/formula resolution happens before the ordinary DefinitionModel pipeline;
- external input parsing rebuilds recognized structures from `unknown` instead of trusting casts;
- ObservationDataset is not converted into supplied parameters;
- forward facade, scenario comparison and sensitivity compose existing layers instead of replacing them.

A future breaking v2 should be a deliberate compatibility decision, not an incidental side effect of adding reverse estimation.

## Public forward-v1 handoff path

A contributor evaluating the current forward engine should begin with:

```text
README.md
docs/external-input.md
docs/forward-evaluation.md
docs/scenario-comparison.md
docs/parameter-sensitivity.md
docs/observations.md
docs/forward-v1-support-matrix.md
```

Representative production entry points are:

```text
prepareExternalModelInput / prepareExternalModelJson
evaluateExternalModelInput / evaluateExternalModelJson
compareExternalModelScenarios
analyzeParameterSensitivity
```

Lower-level APIs remain available when direct solver or model control is required.

## Forward v1 completion judgment

For the current project scope, the forward path is sufficiently integrated to be treated as a **forward v1 candidate** rather than an unfinished collection of isolated helpers.

The next work should not invent another forward feature merely because it is easy to add. It should either:

1. repair a concrete forward-v1 correctness gap discovered by a representative model, or
2. establish the smallest mathematically explicit reverse-estimation contract on top of the already separate ObservationDataset boundary.

## Reverse-estimation handoff boundary

The smallest next Seikatan-style layer should keep these concepts separate:

```text
unknown parameter
candidate value / candidate set
observation dataset
constraint
likelihood or explicitly named score
estimation result
```

A first reverse PoC may rank a finite candidate set using an explicitly documented likelihood computed from observation counts.

It must not:

- copy an observed frequency directly into a parameter and call that inference;
- call a likelihood a posterior;
- introduce a prior unless prior semantics are actually used;
- claim continuous estimation from a finite candidate search;
- consume generic scalar observations without a declared observation model;
- hide impossible observations or zero-probability events behind arbitrary smoothing.
