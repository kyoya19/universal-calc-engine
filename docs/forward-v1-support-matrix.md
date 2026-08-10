# Forward v1 support matrix and handoff map

## Purpose

This document is the implementation-backed support boundary for the current Kiyotan forward-v1 candidate and the bounded Seikatan reverse layer beside it.

Status words mean:

- **supported**: production implementation, public core export, and CI coverage exist;
- **supported with boundary**: implemented with a semantic or scope limit callers must preserve;
- **partial**: useful implementation exists but does not cover the full project surface;
- **unsupported**: no production contract exists and adjacent helpers must not be reinterpreted as one.

## Support matrix

| Capability | Status | Current contract | Important boundary |
|---|---|---|---|
| Model definition | supported | `DefinitionModel`, parameterized variants | explicit finite state model; no arbitrary executable code |
| State / transition | supported | explicit IDs and `from -> to` transitions | solver target remains `transition.to` |
| Probability | supported with boundary | scalar, parameter reference, explicit formula tree | finite validation; no symbolic algebra engine |
| Reward | supported | legacy scalar reward | legacy reward has no explicit unit metadata |
| Elapsed time | supported | ms/sec/min/hour normalized to seconds | no general dimensional algebra |
| Expected reward | supported | iterative solver plus diagnostics | convergence contract applies |
| Reachability | supported | explicit target states | generic reachability, not domain-specific win semantics |
| Expected elapsed time | supported | downstream time expectation | non-convergence remains explicit |
| Reward rate | supported with boundary | `E[reward] / E[time]` | not `E[reward / time]` |
| Named reward axes | supported with boundary | independent axes with unit/kind metadata | no implicit netting or conversion |
| Parameter refs / formula scalars | supported with boundary | explicit refs and arithmetic trees | no string eval or arbitrary code |
| Checked external forward input | supported | versioned JSON/unknown boundary | JSON parse success is not type validation |
| Structured validation | supported | code/severity/path/message | additive; legacy exceptions remain |
| Solver diagnostics | supported | convergence, iterations, tolerance, last delta, context | legacy defaults unchanged |
| Contribution output | supported with boundary | transition contribution rows | explanatory, not automatic causal attribution |
| Scenario comparison | supported with boundary | same model, candidate - baseline | multi-parameter difference is descriptive |
| One-at-a-time sensitivity | supported with boundary | one selected parameter changed per point | conditional on fixed baseline values |
| ObservationDataset | supported | `state_count`, `transition_count`, `scalar` | observations remain evidence, not parameters |
| Observation parsing/validation | supported | checked JSON/unknown plus model-linked checks | validation alone implies no likelihood |
| Transition-count reverse likelihood | supported with boundary | one unknown, finite candidates, conditional transition log-likelihood | complete departure counts; no prior/posterior |
| Scalar Gaussian reverse likelihood | supported with boundary | one unknown, finite candidates, explicit predictor/unit/sigma | scalar conditional independence declared; non-converged predictions rejected |
| Composite transition + scalar likelihood | supported with boundary | one unknown, finite candidates, explicit evidence partition and component composition | between-block conditional independence must be declared; no silent unused evidence |
| Multi-parameter transition grid | supported with boundary | 2+ unknowns, exhaustive finite Cartesian transition-likelihood search | mandatory `maxCombinations`; finite-grid ties only |
| Multi-parameter composite grid | supported with boundary | 2+ unknowns, exhaustive finite Cartesian search using existing composite scorer | typed API in this stage; mandatory `maxCombinations`, explicit evidence partition/independence, finite-grid identifiability only |
| Checked reverse external input | supported with boundary | generic versioned dispatcher covers the four previously checked reverse kinds | new multi-parameter composite kind is not yet wired into this dispatcher in this stage |
| Reverse result handoff | supported with boundary | versioned structured summary for previously checked reverse results | new multi-parameter composite result is not yet included in handoff union in this stage |
| JSON output | supported with boundary | structured result and handoff serializers | not one universal historical wire schema |
| Plain-text reverse handoff | supported with boundary | concise method/estimate/evidence/prior/posterior/warning/limitation view | convenience renderer, not an independent statistical calculation |
| TeX output | partial | expected-reward/contribution helpers | not a complete forward/reverse renderer |
| Report model | partial | graph/probability/generated-target reports | not a unified v1 report |
| Transition effects | partial | `set_property` | richer actions require a demonstrated generic use case |
| State generation | partial / diagnostic | graph/state-generation helpers | generated targets do not drive production solvers |
| Automatic unit conversion | unsupported | — | unit strings are only compared where contracts require them |
| Continuous parameter estimation | unsupported | — | no continuous optimizer/adaptive search |
| Multi-parameter causal attribution | unsupported | — | estimation is not causal attribution; an explicit interaction method is required |
| Bayesian prior/posterior | unsupported | — | likelihood ratios must not be relabelled as posterior probabilities |
| Hidden-state inference | unsupported | — | no HMM/state posterior contract |
| GUI / web API | unsupported | — | core package boundary only |
| Domain-specific large models | unsupported as core commitments | — | digipachi/Juoh remain later representative applications |

## Forward mathematical boundaries

The engine keeps expected reward, reachability, expected time, and reward rate distinct.

```text
reward rate = E[reward] / E[elapsed time]
```

Scenario comparison reports `candidate - baseline`. One-at-a-time sensitivity changes one selected parameter while the caller's other supplied baseline values remain fixed. Neither is an automatic causal decomposition.

## Reverse mathematical boundaries

### Transition-count likelihood

```text
score_transition = sum k * log(p)
```

The multinomial coefficient common to all candidates for the same observations is omitted. This preserves ranking and likelihood ratios.

### Scalar Gaussian likelihood

For observed value `y`, predicted value `mu`, and caller-supplied finite `sigma > 0`:

```text
log L_scalar = -log(sigma * sqrt(2*pi))
               - 0.5 * ((y - mu) / sigma)^2
```

Current predictor contracts are:

```text
expected_elapsed_time_seconds
reward_axis_expected_value(axisId)
```

Observation, predictor, and Gaussian error-model units must match exactly. Multiple scalar observations are summed only under:

```text
scalar_observations_conditionally_independent_given_candidate
```

### Composite likelihood

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

The component estimators are reused. The caller must declare:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

Under that assumption:

```text
totalScore = transitionScore + scalarGaussianScore
```

The transition component still omits its candidate-independent multinomial constant, so the composite total is a log-likelihood score up to that constant. Relative likelihood ratios remain valid because the constant cancels.

Every observation must be assigned to exactly one component block. A positive observed transition count with candidate probability zero keeps the composite candidate impossible. Scalar predictor non-convergence remains a rejection rather than a fabricated score.

### Multi-parameter transition grid

```text
searchMethod = finite_cartesian_parameter_grid
likelihoodMethod = conditional_transition_log_likelihood_without_multinomial_constant
```

The grid layer exhaustively scores eligible assignments through the existing transition estimator. `maxCombinations` is mandatory and no truncation or sampling is substituted silently. A tied best set indicates non-identifiability only on the supplied finite grid.

### Multi-parameter composite grid

The search method remains:

```text
finite_cartesian_parameter_grid
```

The per-assignment composite method remains:

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

The grid layer does not define another likelihood. For each complete eligible assignment it injects all assigned parameter values into the model and calls the existing single-parameter composite estimator with one assignment value as an anchor candidate. Therefore transition likelihood, scalar Gaussian likelihood, evidence partition, conditional-independence semantics, zero-probability impossible events, and scalar convergence rules remain owned by the established component/composite implementations.

The result preserves:

```text
transitionLogLikelihoodScore
scalarGaussianLogLikelihoodScore
totalLogLikelihoodScore
relativeLikelihoodToBest
```

as separate concepts.

Constraints are applied before Cartesian expansion. `rawCombinationCount`, `eligibleCombinationCount`, and mandatory `maxCombinations` are explicit. No truncation, sampling, adaptive optimization, or continuous fallback is substituted.

A tied best set means non-identifiability only on the supplied finite eligible grid. It is not causal attribution and not a proof of global structural identifiability.

## Checked reverse input boundary

The generic reverse dispatcher currently supports:

```text
discrete_parameter_candidates
scalar_gaussian_parameter_candidates
composite_parameter_candidates
multi_parameter_transition_grid
```

It separates:

```text
json_syntax
shape
estimation
```

and reuses the existing `ExternalModelDocument` and `ObservationDataset` parsers.

At the shape stage it checks primitives and discriminants. It deliberately does **not** deduplicate candidates, repair sigma, infer predictors, convert units, clip constraints, truncate/sample a grid, or infer composite independence assumptions.

Those remain explicit caller input or estimator semantics.

The older discrete-specific checked functions remain supported for compatibility.

The newly added multi-parameter composite typed estimator should be added to the generic checked dispatcher only after the typed contract remains CI-stable. That follow-up must preserve the same non-normalizing parser boundary.

## Reverse result handoff boundary

The reverse handoff is an interpretation surface above `ExternalReverseMethodResult`:

```text
ExternalReverseMethodResult
→ toReverseResultHandoff
→ ReverseResultHandoff
```

It preserves method/search names, selection, method-specific ranking scores, used observations, constraints, explicit assumptions, search limits, diagnostics where present, prior/posterior flags, warnings, and limitations.

It does not compute a new likelihood, create confidence/credible intervals, reinterpret likelihood ratios as posterior probability, choose one value from a tie, convert finite-grid identifiability into global structural identifiability, or convert estimation into causal attribution.

The new multi-parameter composite typed result should join this handoff only after its checked external result kind exists, so that the handoff remains a stable summary over checked reverse results rather than a parallel execution path.

## Compatibility boundary

Current additions remain additive:

- existing `DefinitionModel` remains usable;
- legacy reward remains separate from named axes;
- parameter/formula resolution occurs before ordinary evaluation;
- ObservationDataset is not converted into supplied parameters;
- transition, scalar Gaussian, and composite likelihood methods remain explicitly named and separate;
- single-parameter composite composition reuses existing component estimators;
- multi-parameter transition grid reuses the transition scorer;
- multi-parameter composite grid reuses the single-parameter composite scorer;
- generic checked reverse input sits above existing typed estimators instead of replacing them;
- reverse handoff sits above checked results instead of mutating estimator result types;
- forward comparison/sensitivity remain analytical layers, not reverse aliases;
- multi-parameter estimation is not causal attribution.

## Handoff map

Forward:

```text
README.md
docs/external-input.md
docs/forward-evaluation.md
docs/scenario-comparison.md
docs/parameter-sensitivity.md
docs/forward-v1-support-matrix.md
```

Reverse:

```text
docs/observations.md
docs/discrete-estimation.md
docs/reverse-external-input.md
docs/reverse-external-methods.md
docs/scalar-gaussian-estimation.md
docs/composite-likelihood-estimation.md
docs/multi-parameter-grid-estimation.md
docs/multi-parameter-composite-grid-estimation.md
docs/reverse-result-handoff.md
```

Representative typed entry points:

```text
estimateDiscreteParameterCandidates
estimateScalarGaussianParameterCandidates
estimateCompositeParameterCandidates
estimateMultiParameterGrid
estimateMultiParameterCompositeGrid
```

Checked / handoff entry points currently remain:

```text
parseExternalReverseEstimationDocument / parseExternalReverseEstimationJson
estimateExternalReverseInput / estimateExternalReverseJson
toReverseResultHandoff
reverseResultHandoffToJson
formatReverseResultHandoffPlainText
```

## Completion judgment

Kiyotan remains a coherent **forward v1 candidate**.

Seikatan now has explicit finite-candidate likelihood/search contracts for transition counts, scalar Gaussian measurements, single-parameter composite evidence, multi-parameter transition grids, and a typed multi-parameter composite grid that reuses the established composite scorer. The previously checked reverse methods also have checked third-party input and structured result handoff.

The immediate remaining parity gap is to add the new multi-parameter composite kind to checked external input and `ReverseResultHandoff` without relaxing parser, statistical, or finite-grid boundaries. Bayesian prior/posterior remains lower priority until meaningful prior information is supplied.
