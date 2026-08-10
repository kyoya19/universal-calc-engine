# Forward v1 support matrix and handoff boundary

## Purpose

This document records the implemented support boundary of the current Kiyotan-style forward engine.

It is a handoff map, not a wish list. `supported` means a public implementation exists in `packages/core/src` and is reachable through the exported core surface. `limited` means an implementation exists but only for a narrower contract. `unsupported` means a caller must not assume the capability exists.

The matrix is intentionally based on the repository implementation rather than on earlier conversation history.

## Support matrix

| Capability | Status | Current contract | Important boundary |
| --- | --- | --- | --- |
| model definition | supported | `DefinitionModel`, parameterized variants, base and named-reward-axis models | not a general probabilistic programming language |
| state / transition | supported | explicit state IDs and explicit `from -> to` transitions | solver target remains `transition.to`; generated targets are diagnostic-only |
| terminal state | supported | explicit boolean or `property_equals` terminal condition | no arbitrary predicate execution |
| transition effects | limited | `set_property` only | richer state mutation is not implemented |
| probability | supported | scalar, parameter reference, explicit formula after resolution | no distributions-as-values or symbolic probability algebra at solve time |
| reward | supported | legacy scalar reward per transition | legacy reward is separate from named reward axes |
| elapsed time | supported | milliseconds / seconds / minutes / hours, normalized to seconds | no calendar/time-zone scheduling model |
| expected reward | supported | iterative forward solver | result depends on convergence of the selected iterative solve |
| reachability probability | supported | optional explicit target state set | no domain-specific implicit "win" semantics |
| expected elapsed time | supported | expected downstream elapsed time | divergent/infinite expectations appear through non-convergence rather than an analytic infinity proof |
| reward rate | supported | `E[reward] / E[elapsed time]`, marked `ratio_of_expectations` | not `E[reward / elapsed time]` |
| named reward axes | supported | independent named axes with unit and benefit/cost/neutral metadata | axes are never implicitly netted or converted |
| parameter references | supported | declared parameters with supplied values or defaults | all resolved values are finite numbers |
| parameter formulas | limited | add / subtract / multiply / divide expression trees | no string eval, functions, conditionals, symbolic simplification, or unit algebra |
| external input | supported | versioned `schemaVersion: 1` base / reward-axes documents | unknown input is shape-checked before resolution |
| external failure staging | supported | `json_syntax`, `shape`, `parameter_resolution`, `model_validation` | parameter-resolution internals remain exception-based below the external boundary |
| structured validation | supported | code / severity / path / message | additive API; legacy expand/evaluate exception behavior remains |
| solver diagnostics | supported | solver kind, convergence, iterations, tolerance, last delta, context | legacy solver defaults and exception behavior remain unchanged |
| contribution output | supported | transition contribution rows inside a solved scenario | this is not automatically a causal attribution method |
| integrated forward facade | supported | checked input through forward outputs and diagnostics | lower-level APIs remain public and are not replaced |
| scenario comparison | supported | one model, baseline parameters, candidate parameters, `candidate - baseline` deltas | multi-parameter differences are descriptive, not unique causal decomposition |
| one-at-a-time sensitivity | supported | change one selected supplied parameter per comparison point | local/discrete counterfactual sweep; not a derivative engine or global sensitivity method |
| ObservationDataset | supported as input boundary | `state_count`, `transition_count`, `scalar` records plus parsing and model-linked validation | observations are not model parameters and are not automatically estimates |
| JSON output | supported for several public result types | explicit JSON helpers and ordinary JSON-serializable facade structures | Map-based lower-level structures require conversion helpers before direct JSON use |
| TeX output | limited | expected-reward and contribution TeX helpers | no complete TeX rendering for every forward-v1 result or parameter formula |
| report model | limited | generic report rows/sections plus graph/audit and boundary-oriented reports | not yet a complete forward-v1 narrative report generator |
| Monte Carlo | unsupported as core solve default | none required for the current exact/iterative state-transition path | simulation may be added later as validation/approximation, not assumed today |
| exact matrix / symbolic solver selection | unsupported as public strategy layer | current forward solvers are iterative | architecture does not yet expose automatic algorithm selection |
| automatic dimensional analysis | unsupported | unit metadata and time normalization only | same textual unit does not cause automatic arithmetic or conversion across reward axes |
| arbitrary executable expressions | unsupported | explicit expression trees only | no `eval`, function source, or dynamic code execution |
| multi-parameter causal attribution | unsupported | scenario/contribution differences only | Shapley, ordered marginal, or another method must be chosen explicitly first |
| reverse estimation / Seikatan | not part of forward v1 | ObservationDataset boundary exists | reverse estimation requires a separate likelihood/score contract |

## Public forward path

The forward v1 candidate path is:

```text
external JSON / unknown
→ checked external document
→ parameter / formula resolution
→ structured model validation
→ expand
→ evaluate
→ expected reward
→ expected elapsed time
→ optional reachability
→ ratio-of-expectations reward rate
→ contribution
→ optional named reward axes + axis contribution
→ convergence diagnostics
→ structured forward result
```

Higher-level analysis adds:

```text
same model + baseline/candidate parameter sets
→ scenario comparison
```

and:

```text
same model + baseline + one selected parameter + candidate values
→ one-at-a-time sensitivity
```

## Mathematical limitations

### Iterative convergence

The expected-reward, reachability, expected-elapsed-time, and named-axis solvers use iterative fixed-point style evaluation. Diagnostic variants expose convergence state and the last maximum delta.

The current engine does not prove that every finite mathematical solution will converge under every state ordering, nor does it analytically classify divergent/infinite cases.

### Reward rate

Reward rate is deliberately defined as:

```text
E[reward] / E[elapsed time]
```

It is not the expectation of a per-run ratio.

### Scenario differences

A scenario comparison reports arithmetic differences between two solved scenarios. When multiple parameters change at once, those differences do not establish a unique additive causal attribution.

### One-at-a-time sensitivity

One-at-a-time sensitivity has a clearer counterfactual meaning because one selected supplied parameter changes while the other supplied baseline parameters are held fixed. It still does not capture all interactions or replace a global sensitivity method.

### Units

Time units are normalized explicitly. Other unit strings are descriptive metadata. The engine does not perform general dimensional analysis.

## Compatibility boundary

Forward v1 additions have been implemented additively.

The following compatibility rules are intentional:

- legacy scalar `reward` remains available
- named reward axes remain separate from legacy reward
- lower-level expand/evaluate/solver APIs remain available
- structured validation does not silently replace legacy exception behavior
- diagnostic solver variants do not silently change legacy solver defaults
- external-input parsing does not trust `JSON.parse` as type validation
- ObservationDataset is not injected into parameter resolution
- scenario comparison and sensitivity reuse the same model structure rather than cloning domain-specific engines
- generated targets remain diagnostic-only for solver target selection

A future breaking change should be justified as an explicit compatibility decision rather than introduced as a side effect of another feature.

## Handoff entry points

A new contributor should start with:

```text
README.md
docs/forward-v1-support-matrix.md
docs/forward-evaluation.md
docs/scenario-comparison.md
docs/parameter-sensitivity.md
docs/external-input.md
docs/observations.md
docs/parameterized-scalars.md
docs/solver-diagnostics.md
docs/outcome-continuation-review.md
```

The main public export surface is:

```text
packages/core/src/index.ts
```

Representative non-domain-specific forward examples are under:

```text
packages/core/examples/
```

## Forward v1 decision

The current implementation is sufficiently integrated to treat the Kiyotan-style forward engine as a **forward v1 candidate boundary**.

Further forward work should require a demonstrated missing capability. The next large conceptual step can therefore move into a minimal reverse-estimation contract without redefining or weakening the forward boundary.

That reverse contract must keep these concepts distinct:

```text
parameter
observation
candidate
constraint
likelihood or score
estimate
prior
posterior
```

A first reverse implementation should prefer an explicit likelihood/score over introducing a Bayesian prior before a use case requires one.
