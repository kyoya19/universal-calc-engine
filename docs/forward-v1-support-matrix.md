# Forward v1 support matrix and handoff map

## Purpose

This document is the implementation-backed support boundary for the current Kiyotan forward-v1 candidate and the small Seikatan reverse layer that now sits beside it.

Status words mean:

- **supported**: production implementation, public core export, and CI coverage exist;
- **supported with boundary**: implemented with a semantic or scope limit callers must preserve;
- **partial**: useful implementation exists but does not cover the full project surface;
- **unsupported**: no production contract exists and adjacent helpers must not be reinterpreted as one.

## Support matrix

| Capability | Status | Current contract | Important boundary |
|---|---|---|---|
| Model definition | supported | `DefinitionModel`, parameterized variants | explicit finite state model; no arbitrary executable model code |
| State / transition | supported | explicit state IDs and `from -> to` transitions | solver target remains `transition.to`; generated targets are diagnostics-only |
| Probability | supported with boundary | scalar, parameter reference, explicit formula tree after resolution | finite probability validation; no symbolic algebra engine |
| Reward | supported | legacy scalar reward per transition | legacy reward has no explicit unit metadata |
| Elapsed time | supported | milliseconds / seconds / minutes / hours normalized to seconds | no general dimensional algebra |
| Expected reward | supported | iterative forward solver plus diagnostics | convergence contract applies |
| Reachability probability | supported | explicit target-state set | generic reachability, not a domain-specific win semantic |
| Expected elapsed time | supported | downstream transition time expectation | divergent/non-convergent models remain explicit |
| Reward rate | supported with boundary | `E[reward] / E[elapsed time]` | not `E[reward / elapsed time]` |
| Named reward axes | supported with boundary | independent axes with id/unit/kind metadata | no implicit netting or conversion across axes |
| Parameter references | supported | declared numeric parameters with optional defaults | supplied values must be finite |
| Formula scalars | supported with boundary | add/subtract/multiply/divide trees | no string eval, arbitrary code, or symbolic simplification |
| External forward input | supported | versioned JSON/unknown boundary for base and reward-axis models | JSON syntax success is not type validation |
| Structured validation | supported | code/severity/path/message issues | additive; legacy expand/evaluate exceptions remain |
| Solver diagnostics | supported | convergence, iterations, tolerance, last max delta, context | legacy defaults unchanged |
| Contribution output | supported with boundary | transition contribution rows within one solved scenario | explanatory decomposition, not automatic causal attribution |
| Scenario comparison | supported with boundary | same model, baseline vs candidate parameters, `candidate - baseline` | multi-parameter difference is descriptive |
| One-at-a-time sensitivity | supported with boundary | one selected parameter changed per point | conditional on other supplied baseline parameters being fixed |
| ObservationDataset | supported | `state_count`, `transition_count`, `scalar` records | observations remain evidence, not parameters |
| Observation parsing/validation | supported | JSON/unknown parsing plus model-linked checks | validation alone implies no likelihood |
| Transition-count reverse likelihood | supported with boundary | one unknown parameter, finite candidates, conditional transition log-likelihood | requires complete departure counts; no prior/posterior |
| Scalar Gaussian reverse likelihood | supported with boundary | one unknown parameter, finite candidates, explicit scalar binding and Gaussian error model | only explicit unit-bearing predictors are accepted; conditional independence is declared |
| Checked reverse external input | supported with boundary | current transition-count estimator has versioned reverse JSON envelope | scalar Gaussian external envelope is not yet part of this contract |
| JSON output | supported with boundary | serialization helpers for structured results | not one universal historical wire schema |
| TeX output | partial | expected-reward and contribution TeX helpers | not a complete forward/reverse renderer |
| Report model | partial | state graph, probability audit and generated-target reports | not a unified v1 report |
| Transition effects | partial | `set_property` | richer actions require a demonstrated generic use case |
| State generation | partial / diagnostic | graph/state-generation helpers | generated targets do not drive production solvers |
| Automatic unit conversion | unsupported | — | unit strings are compared where contracts require them; no conversion engine |
| Multi-parameter estimation | unsupported | — | no Cartesian candidate grid or continuous optimizer yet |
| Multi-parameter causal attribution | unsupported | — | requires an explicit ordered-marginal, Shapley-style, or other interaction method |
| Bayesian prior/posterior | unsupported | — | likelihood ratios must not be called posterior probabilities |
| Hidden-state inference | unsupported | — | no HMM/state posterior contract |
| GUI / web API | unsupported | — | core package boundary only |
| Domain-specific large models | unsupported as core commitments | — | digipachi/Juoh remain later representative applications |

## Forward mathematical boundaries

The engine keeps expected reward, reachability probability, expected elapsed time, and reward rate distinct.

Reward rate is:

```text
E[reward] / E[elapsed time]
```

and not generally:

```text
E[reward / elapsed time]
```

A valid model may return a non-converged diagnostic result. The last approximation must not be silently presented as an exact converged value.

Scenario comparison reports `candidate - baseline`. A multi-parameter scenario difference is not automatically assigned to unique causes. One-at-a-time sensitivity changes one selected parameter while holding the caller's other supplied baseline parameters fixed; it is not a global sensitivity index.

## Reverse mathematical boundaries

### Transition-count likelihood

The first reverse estimator uses:

```text
sum k * log(p)
```

for observed transition counts `k` and candidate transition probabilities `p`, omitting only the multinomial constant that is common to all candidates for the same observations.

It reports a likelihood ratio relative to the best candidate and explicitly states that no prior or posterior was computed.

### Scalar Gaussian likelihood

The scalar estimator does not infer a model predictor from an observation metric string. Each `observationId` is explicitly bound to a supported predictor.

Current predictor contracts are:

```text
expected_elapsed_time_seconds
reward_axis_expected_value(axisId)
```

For observed value `y`, predicted value `mu`, and caller-supplied finite `sigma > 0`:

```text
log L = -log(sigma * sqrt(2*pi)) - 0.5 * ((y - mu) / sigma)^2
```

Multiple bound scalar observations are summed under the declared assumption:

```text
scalar_observations_conditionally_independent_given_candidate
```

Observation unit, predictor unit, and Gaussian error-model unit must match exactly. No default sigma, epsilon smoothing, unit conversion, prior, or posterior is introduced.

## Compatibility boundary

The current work remains additive:

- existing `DefinitionModel` remains usable;
- legacy scalar reward remains separate from named reward axes;
- structured validation does not replace historical exception behavior;
- diagnostic solvers do not change legacy solver defaults;
- parameter/formula resolution occurs before ordinary model evaluation;
- external input rebuilds recognized data from `unknown` instead of trusting casts;
- ObservationDataset is not converted into supplied parameters;
- transition-count and scalar Gaussian likelihoods remain separately named statistical methods;
- scenario comparison and sensitivity remain forward analytical layers rather than reverse inference aliases.

A future breaking v2 must be deliberate rather than an incidental consequence of adding reverse features.

## Handoff map

Forward entry path:

```text
README.md
docs/external-input.md
docs/forward-evaluation.md
docs/scenario-comparison.md
docs/parameter-sensitivity.md
docs/forward-v1-support-matrix.md
```

Reverse entry path:

```text
docs/observations.md
docs/discrete-estimation.md
docs/reverse-external-input.md
docs/scalar-gaussian-estimation.md
```

Representative public entry points include:

```text
prepareExternalModelInput / prepareExternalModelJson
evaluateExternalModelInput / evaluateExternalModelJson
compareExternalModelScenarios
analyzeParameterSensitivity
estimateDiscreteParameterCandidates
estimateExternalDiscreteParameterInput / estimateExternalDiscreteParameterJson
estimateScalarGaussianParameterCandidates
```

## Completion judgment

The Kiyotan side is sufficiently integrated to remain a **forward v1 candidate**.

The Seikatan side is still intentionally small, but it now has two explicit likelihood families over a finite single-parameter candidate set:

1. transition-count conditional likelihood;
2. scalar Gaussian likelihood with explicit predictor, unit, sigma, and independence assumptions.

The next reverse expansion should be selected by demonstrated analytical value. Multi-parameter candidate grids are a plausible next step because they preserve finite likelihood semantics, but candidate-space growth and identifiability must be explicit. Bayesian prior/posterior work remains lower priority until a concrete use case requires it.
