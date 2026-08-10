# v1 support matrix and handoff map

## Purpose

This document is the implementation-backed support boundary for the current **Kiyotan forward v1 + finite-candidate-centered Seikatan v1 functional contract**.

The broader completion decision and severity review are in:

```text
docs/v1-completion-boundary.md
```

Status words mean:

- **supported**: production implementation, public core export, and CI coverage exist;
- **supported with boundary**: implemented with a mathematical, statistical, compatibility, or scope limit callers must preserve;
- **partial**: useful implementation exists but is not part of the complete v1 surface;
- **unsupported / post-v1**: no current v1 production contract exists.

## Support matrix

| Capability | Status | Current contract | Important boundary |
|---|---|---|---|
| Model definition | supported | `DefinitionModel`, parameterized variants | explicit finite state model; no arbitrary executable code |
| State / transition | supported | explicit IDs and `from -> to` transitions | production solver target remains `transition.to` |
| Probability | supported with boundary | scalar, parameter reference, explicit formula tree | no symbolic algebra engine / string eval |
| Legacy scalar reward | supported with boundary | transition reward | no explicit reward-unit metadata |
| Elapsed time | supported | ms/sec/min/hour normalized to seconds | no general dimensional algebra |
| Expected reward | supported with boundary | iterative solver + diagnostics | non-convergence remains explicit |
| Reachability | supported with boundary | explicit target states | generic reachability, not implicit domain win semantics |
| Expected elapsed time | supported with boundary | iterative solver + diagnostics | non-convergence remains explicit |
| Reward rate | supported with boundary | `E[reward] / E[time]` | not `E[reward / time]`; zero time => null rate |
| Named reward axes | supported with boundary | independent axes with unit/kind metadata | no implicit netting or unit conversion |
| Parameter refs / formula scalars | supported with boundary | explicit refs and arithmetic trees | no executable formula strings |
| Checked external forward input | supported | versioned JSON/unknown boundary | syntax, shape, resolution, validation remain distinct |
| Structured model validation | supported | code/severity/path/message | warnings remain distinct from errors |
| Solver diagnostics | supported | converged, iterations, tolerance, last delta, context | iterative contract, not exact closed-form guarantee |
| Contribution output | supported with boundary | transition expected-value contribution rows | descriptive, not causal attribution |
| Scenario comparison | supported with boundary | same model, `candidate - baseline` | descriptive difference, not automatic causal decomposition |
| One-at-a-time sensitivity | supported with boundary | one selected parameter per point | other supplied baseline parameters remain fixed |
| Forward result handoff | supported with boundary | versioned `ForwardResultHandoff` | summarizes existing forward semantics only |
| Forward JSON/plain-text handoff | supported with boundary | handoff serializer / concise formatter | formatter is not another calculation engine |
| ObservationDataset | supported | `state_count`, `transition_count`, `scalar` | evidence is not copied into parameters |
| Observation parsing/validation | supported | checked JSON/unknown + model-linked checks | validation alone implies no likelihood |
| Transition-count reverse likelihood | supported with boundary | one unknown, finite candidates | complete departure evidence; no prior/posterior |
| Scalar Gaussian reverse likelihood | supported with boundary | one unknown, explicit predictor/unit/sigma | conditional independence explicit; non-converged predictors rejected |
| Single-parameter composite likelihood | supported with boundary | explicit transition/scalar partition | between-block conditional independence must be declared |
| Multi-parameter transition grid | supported with boundary | finite exhaustive Cartesian search | mandatory `maxCombinations`; finite-grid identifiability only |
| Multi-parameter composite grid | supported with boundary | finite Cartesian search using existing composite scorer | mandatory limit, explicit partition/independence, no new likelihood |
| Checked reverse external input | supported with boundary | generic versioned dispatcher covers all five kinds | parser validates shape but does not normalize statistical semantics |
| Reverse result handoff | supported with boundary | versioned `ReverseResultHandoff` covers all five kinds | no posterior/confidence/causal claims invented |
| Reverse JSON/plain-text handoff | supported with boundary | handoff serializer / concise formatter | formatter is not another estimator |
| Package-root TypeScript export | supported | `packages/core/src/index.ts` | source-level core export; not an npm 1.0 distribution contract |
| npm/package release 1.0 metadata | partial / post-v1 distribution | root development package metadata | functional-contract v1 != npm package 1.0 release |
| TeX output | partial | expected-reward/contribution helpers | not a complete forward/reverse renderer |
| Historical report model/helpers | partial | graph/probability/boundary helpers | not the authoritative v1 handoff |
| Transition effects | partial | `set_property` | richer effects require a demonstrated generic use case |
| State generation | partial / diagnostic | graph/state-generation helpers | generated targets do not drive production solvers |
| Automatic unit conversion | unsupported / post-v1 | — | exact unit matching remains where required |
| General dimensional algebra | unsupported / post-v1 | — | not inferred from unit strings |
| Continuous/adaptive estimation | unsupported / post-v1 | — | finite candidate/grid v1 only |
| Bayesian prior/posterior | unsupported / post-v1 | — | likelihood ratios are not posterior probabilities |
| Confidence/credible intervals | unsupported / post-v1 | — | no interval claim is generated |
| Hidden-state inference | unsupported / post-v1 | — | no HMM/state-posterior contract |
| Multi-parameter causal attribution | unsupported / post-v1 | — | estimation is not attribution; explicit method required |
| GUI / web API product layer | unsupported / post-v1 | — | analytical core only |
| Large domain-specific models | post-v1 applications | — | digipachi/Juoh remain later applications, not core commitments |

## Forward v1 path

```text
external JSON / unknown
→ checked external model
→ parameter / formula resolution
→ structured validation
→ expand / evaluate
→ expected reward
→ expected elapsed time
→ optional reachability
→ ratio-of-expectations reward rate
→ contribution
→ optional named reward axes
→ convergence diagnostics
→ ForwardEvaluationResult
→ ForwardResultHandoff
```

Preferred entry points:

```text
evaluateExternalModelInput
evaluateExternalModelJson
toForwardResultHandoff
forwardResultHandoffToJson
formatForwardResultHandoffPlainText
```

## Forward mathematical boundaries

### Reward rate

```text
rateKind = ratio_of_expectations
reward rate = E[reward] / E[elapsed time]
```

It is not `E[reward / elapsed time]`.

### Non-convergence

A checked, valid model may produce:

```text
ok: true
converged: false
```

The result/handoff preserves the last approximation and diagnostics. It does not fabricate convergence.

### Reachability

Reachability is explicit target-state probability. It is not automatically named a domain-specific win probability.

### Named axes

Named reward axes remain independent. The engine does not silently net axes or convert units.

### Contribution

Contribution rows are descriptive expected-value decomposition, not an automatic causal attribution method.

## Reverse v1 contracts

Checked `estimationKind` values:

```text
discrete_parameter_candidates
scalar_gaussian_parameter_candidates
composite_parameter_candidates
multi_parameter_transition_grid
multi_parameter_composite_grid
```

### Transition-count likelihood

```text
conditional_transition_log_likelihood_without_multinomial_constant
score = sum k * log(p)
```

The same-evidence candidate-independent multinomial constant is omitted.

### Scalar Gaussian likelihood

```text
conditionally_independent_gaussian_scalar_log_likelihood
```

The caller explicitly supplies predictor, Gaussian sigma, and unit. The parser does not invent them.

### Composite likelihood

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

Required explicit assumption:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

All observations must belong to exactly one evidence block.

### Multi-parameter search

```text
searchMethod = finite_cartesian_parameter_grid
```

Both current multi-parameter families require finite candidate dimensions and explicit `maxCombinations`.

No silent truncation, sampling, continuous fallback, or adaptive search is substituted.

Multi-parameter composite reuses the existing single-parameter composite scorer per complete assignment rather than defining another likelihood.

## Reverse checked input boundary

Preferred entry points:

```text
parseExternalReverseEstimationDocument
parseExternalReverseEstimationJson
estimateExternalReverseInput
estimateExternalReverseJson
```

Failure categories:

```text
json_syntax
shape
estimation
```

The parser deliberately does not:

```text
deduplicate candidates
truncate/sample grids
invent or repair sigma
infer predictors from metric names
convert units
auto-clip constraints
infer evidence partition
infer independence assumptions
copy observations into parameters
```

Legacy discrete-specific checked APIs remain available for compatibility.

## Reverse result handoff boundary

```text
ExternalReverseMethodResult
→ toReverseResultHandoff
→ ReverseResultHandoff
```

Preferred helpers:

```text
toReverseResultHandoff
reverseResultHandoffToJson
formatReverseResultHandoffPlainText
```

The handoff preserves method/search identity, estimate/assignment, ranking, evidence IDs, constraints, assumptions, method-specific scores, diagnostics where applicable, finite-grid limits/identifiability, warnings, limitations, and:

```text
priorUsed: false
posteriorComputed: false
```

`relativeLikelihoodToBest` remains a likelihood ratio, not posterior probability.

Positive observed transition evidence with model probability zero remains impossible; finite scalar evidence does not rescue it.

A non-converged scalar predictor is not used as successful likelihood evidence.

Finite-grid identifiability applies only to the supplied eligible grid and is not a proof of global structural identifiability.

## Compatibility boundary

The v1 declaration is additive:

- typed model/solver APIs remain available;
- `ForwardEvaluationResult` and its existing serializer remain available;
- `ForwardResultHandoff` sits above the existing forward result;
- ObservationDataset remains separate from parameter values;
- all five typed reverse estimators remain available;
- generic checked reverse input sits above typed estimators;
- legacy discrete-specific checked reverse APIs remain supported;
- `ReverseResultHandoff` sits above checked reverse results;
- generated-target diagnostics remain separate from production solver targeting;
- historical TeX/report helpers remain partial rather than being promoted to complete v1 renderers.

Breaking cleanup after this point should use an explicit migration/schema/version decision.

## Handoff reading order

```text
README.md
docs/v1-completion-boundary.md
docs/forward-v1-support-matrix.md
docs/external-input.md
docs/forward-evaluation.md
docs/forward-result-handoff.md
docs/scenario-comparison.md
docs/parameter-sensitivity.md
docs/observations.md
docs/discrete-estimation.md
docs/scalar-gaussian-estimation.md
docs/composite-likelihood-estimation.md
docs/multi-parameter-grid-estimation.md
docs/multi-parameter-composite-grid-estimation.md
docs/reverse-external-methods.md
docs/reverse-result-handoff.md
```

Representative complete third-party examples:

```text
packages/core/examples/forward_result_handoff.ts
packages/core/examples/multi_parameter_composite_external_handoff.ts
```

## Completion judgment

The repository has reached the **v1 functional-contract boundary** for the current analytical core.

There are no remaining critical or high production gaps in the checked forward/reverse paths required by this v1 definition.

Remaining medium/low items are explicit partial, distribution, compatibility, or post-v1 concerns documented in `docs/v1-completion-boundary.md`.
