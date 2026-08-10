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
| Parameter references / formula scalars | supported with boundary | explicit refs and add/subtract/multiply/divide trees | no string eval or arbitrary code |
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
| Composite transition + scalar likelihood | supported with boundary | one unknown, finite candidates, explicit evidence partition and component-score composition | between-block conditional independence must be explicitly declared; no silent unused evidence |
| Multi-parameter transition grid | supported with boundary | two or more unknowns, exhaustive finite Cartesian transition-likelihood search | mandatory `maxCombinations`; finite-grid ties only |
| Checked reverse external input | supported with boundary | single-parameter transition estimator has versioned JSON envelope | scalar/composite/grid external envelopes not yet implemented |
| JSON output | supported with boundary | structured result serializers | not one universal historical wire schema |
| TeX output | partial | expected-reward/contribution helpers | not a complete forward/reverse renderer |
| Report model | partial | graph/probability/generated-target reports | not a unified v1 report |
| Transition effects | partial | `set_property` | richer actions require a demonstrated generic use case |
| State generation | partial / diagnostic | graph/state-generation helpers | generated targets do not drive production solvers |
| Automatic unit conversion | unsupported | — | unit strings are only compared where contracts require them |
| Continuous parameter estimation | unsupported | — | no continuous optimizer/adaptive search |
| Multi-parameter composite likelihood | unsupported | — | current composite contract is single-parameter only |
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

The composite method is:

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

It reuses the two existing component estimators and requires the caller to declare:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

Under that assumption:

```text
totalScore = transitionScore + scalarGaussianScore
```

The transition component still omits its candidate-independent multinomial constant, so the composite total is a log-likelihood score up to that constant. Relative likelihood ratios remain valid because the constant cancels.

Every observation must be assigned to exactly one component block. Positive observed transition count with candidate probability zero makes the composite candidate impossible even if its scalar component is finite. Scalar predictor non-convergence remains a rejection, not a fabricated score.

### Multi-parameter finite grid

```text
searchMethod = finite_cartesian_parameter_grid
likelihoodMethod = conditional_transition_log_likelihood_without_multinomial_constant
```

The grid layer does not define a new likelihood. It exhaustively scores eligible parameter assignments through the existing transition estimator. `maxCombinations` is mandatory and no truncation/sampling is substituted silently.

A tied best set indicates non-identifiability only on the supplied finite grid.

## Compatibility boundary

Current additions remain additive:

- existing `DefinitionModel` remains usable;
- legacy reward remains separate from named axes;
- parameter/formula resolution occurs before ordinary evaluation;
- ObservationDataset is not converted into supplied parameters;
- transition, scalar Gaussian, and composite likelihood methods remain explicitly named and separate;
- composite composition reuses existing component estimators rather than copying their probability formulas;
- multi-parameter grid reuses the transition scorer rather than redefining it;
- forward comparison/sensitivity remain analytical layers, not reverse aliases;
- estimation is not causal attribution.

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
docs/scalar-gaussian-estimation.md
docs/composite-likelihood-estimation.md
docs/multi-parameter-grid-estimation.md
```

Representative entry points:

```text
prepareExternalModelInput / prepareExternalModelJson
evaluateExternalModelInput / evaluateExternalModelJson
compareExternalModelScenarios
analyzeParameterSensitivity
estimateDiscreteParameterCandidates
estimateExternalDiscreteParameterInput / estimateExternalDiscreteParameterJson
estimateScalarGaussianParameterCandidates
estimateCompositeParameterCandidates
estimateMultiParameterGrid
```

## Completion judgment

Kiyotan remains a coherent **forward v1 candidate**.

Seikatan is still bounded but now supports:

1. transition-count finite-candidate likelihood;
2. scalar Gaussian finite-candidate likelihood with explicit predictor/unit/sigma assumptions;
3. explicit single-parameter composite evidence likelihood under declared between-block conditional independence;
4. exhaustive finite multi-parameter transition-likelihood grid search with hard size limit and explicit ties.

The highest-value next gap is third-party checked input for the typed-only reverse APIs. Multi-parameter composite search should follow only if a generic use case demonstrates that combined evidence and multiple unknowns are both required. Bayesian prior/posterior remains lower priority.
