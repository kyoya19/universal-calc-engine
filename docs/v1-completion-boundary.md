# v1 completion boundary

## Status

This repository has reached the **v1 functional-contract boundary** for:

```text
Kiyotan forward evaluation
+
finite-candidate / finite-assignment centered Seikatan reverse estimation
```

This statement means that the current core has a coherent, checked, documented third-party path with explicit mathematical and compatibility boundaries.

It does **not** mean that the repository has been published as an npm package version `1.0.0`.

The root `package.json` remains a private development package and its package metadata is a separate distribution concern.

## Completion decision

After the repository-wide review, there are no remaining **critical** or **high** production gaps that prevent the current core from being treated as a v1 functional contract.

The highest completion gap found during the review was the absence of a versioned forward result handoff. That gap was closed by `ForwardResultHandoff` before this completion boundary was declared.

The remaining gaps are medium or low and are explicitly outside, partial, compatibility-only, or post-v1 concerns.

## Severity review

| Area | Severity | Judgment |
|---|---|---|
| Checked forward input | complete for v1 | versioned JSON / unknown boundary exists for base and reward-axis models |
| Forward integrated evaluation | complete for v1 | expected reward, elapsed time, reachability, reward rate, contribution, axes, diagnostics are integrated |
| Forward third-party result handoff | complete for v1 | versioned `ForwardResultHandoff` exists |
| Observation input | complete for current Seikatan v1 | typed/versioned dataset with state-count, transition-count, scalar observations |
| Reverse typed estimators | complete for current Seikatan v1 | five finite candidate/assignment contracts exist |
| Checked reverse input | complete for current Seikatan v1 | all five kinds reachable through one checked dispatcher |
| Reverse third-party result handoff | complete for current Seikatan v1 | versioned `ReverseResultHandoff` covers all five kinds |
| Solver convergence | supported with boundary | iterative convergence is explicit; non-convergence is not hidden |
| Package distribution / npm release metadata | medium | repository package remains private / development-versioned; does not block the functional contract |
| TeX / historical report modules | medium / partial | useful but not a complete forward/reverse renderer; excluded from v1 completion requirement |
| Transition effects | medium / partial | `set_property` exists; richer effects require a demonstrated generic use case |
| Automatic unit conversion / dimensional algebra | medium / unsupported | units remain explicit boundaries; not required for current v1 |
| Exact / closed-form solver family | medium / unsupported | current v1 uses iterative solvers with diagnostics |
| Legacy discrete checked API | low / compatibility | retained intentionally; generic dispatcher is the preferred broad boundary |
| Historical report / boundary helpers | low / compatibility/partial | exported but not represented as the authoritative v1 handoff |
| Bayesian inference | post-v1 | no prior source is supplied; not part of current contract |
| Continuous optimization / MCMC / VI | post-v1 | not required for finite-grid v1 |
| Hidden-state inference | post-v1 | no current hidden-state contract |
| Causal attribution / undefined Shapley semantics | post-v1 | estimation and descriptive contribution are not causal attribution |
| Domain-specific digipachi / Juoh models | post-v1 applications | generic core remains domain-neutral |

## Authoritative public surface

The package-root TypeScript export surface is:

```text
packages/core/src/index.ts
```

The v1 contract does not require every exported historical helper to be a preferred third-party entry point.

The preferred v1 entry paths are listed below.

## Forward v1 input boundary

External model input is versioned:

```text
schemaVersion: 1
modelKind: base | reward_axes
```

Preferred checked entry points:

```text
prepareExternalModelInput
prepareExternalModelJson
evaluateExternalModelInput
evaluateExternalModelJson
```

The checked path keeps these stages distinct:

```text
json_syntax
shape
parameter_resolution
model_validation
evaluation_options
evaluation
```

The parser does not execute arbitrary expression strings. Parameterized scalar expressions are explicit formula trees.

## Forward v1 evaluation boundary

The integrated forward path is:

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
→ reward rate
→ contribution
→ optional named reward axes
→ convergence diagnostics
→ ForwardEvaluationResult
```

Additional supported forward analyses:

```text
scenario comparison
one-at-a-time parameter sensitivity
```

Scenario comparison uses:

```text
candidate - baseline
```

One-at-a-time sensitivity changes one selected parameter while keeping the supplied baseline values of the other parameters fixed.

Neither operation is automatically causal attribution.

## Forward result handoff

Preferred third-party result path:

```text
ForwardEvaluationResult
→ toForwardResultHandoff
→ ForwardResultHandoff
```

The handoff is versioned:

```text
schemaVersion: 1
kind: forward_evaluation_handoff
```

It preserves:

```text
modelKind
converged
validation
expectedReward
expectedElapsedTime
rewardRate
contribution
diagnostics
optional reachability
optional named reward axes
warnings
limitations
```

JSON / plain-text helpers:

```text
forwardResultHandoffToJson
formatForwardResultHandoffPlainText
```

## Forward mathematical boundaries

### Reward rate

Current method:

```text
rateKind = ratio_of_expectations
reward rate = E[reward] / E[elapsed time]
```

It is not:

```text
E[reward / elapsed time]
```

A zero expected elapsed time produces a null reward rate rather than an invented denominator.

### Reachability

Reachability is generic target-state probability.

It is not automatically renamed as a domain-specific win probability.

### Named reward axes

Named reward axes are kept independent.

The core does not silently:

```text
net benefit and cost
convert units
assign exchange rates
create one utility score
```

### Contribution

Contribution rows are descriptive expected-value decomposition.

They are not automatically causal attribution, Shapley values, or a unique interaction allocation.

### Non-convergence

Forward evaluation can validly return:

```text
ok: true
converged: false
```

with explicit diagnostics and the last numerical approximation.

The handoff preserves that status rather than fabricating convergence.

## Observation boundary

`ObservationDataset` is evidence data, not a model definition and not a parameter-value map.

Current observation record types:

```text
state_count
transition_count
scalar
```

Observations are never copied directly into parameters by the checked reverse parser.

## Seikatan v1 reverse contracts

Current checked reverse `estimationKind` values:

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
```

Score:

```text
sum k * log(p)
```

The candidate-independent multinomial constant is omitted for the same transition evidence.

### Scalar Gaussian likelihood

```text
conditionally_independent_gaussian_scalar_log_likelihood
```

The caller explicitly supplies:

```text
observation binding
model-side predictor
Gaussian sigma
unit
```

No sigma, epsilon, predictor, or unit conversion is invented by the parser.

### Single-parameter composite

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

Required explicit between-block assumption:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

Every observation belongs to exactly one evidence block.

### Multi-parameter transition grid

Search method:

```text
finite_cartesian_parameter_grid
```

The caller supplies finite candidates and mandatory `maxCombinations`.

No silent truncation or sampling occurs.

### Multi-parameter composite grid

Search method remains:

```text
finite_cartesian_parameter_grid
```

The per-assignment scorer reuses the existing single-parameter composite estimator.

No separate likelihood formula is introduced by the grid layer.

## Reverse checked input boundary

Preferred generic entry points:

```text
parseExternalReverseEstimationDocument
parseExternalReverseEstimationJson
estimateExternalReverseInput
estimateExternalReverseJson
```

Checked failure categories remain:

```text
json_syntax
shape
estimation
```

The parser deliberately does not:

```text
deduplicate candidates
truncate or sample grids
invent sigma
replace zero sigma with epsilon
infer predictors from metric names
convert units
auto-clip constraints
infer evidence partition
infer independence assumptions
copy observations into parameters
```

## Reverse result handoff

Preferred result path:

```text
ExternalReverseMethodResult
→ toReverseResultHandoff
→ ReverseResultHandoff
```

The handoff is versioned:

```text
schemaVersion: 1
kind: reverse_estimation_handoff
```

It preserves method/search identity, estimate/assignment, ranking, evidence IDs, constraints, assumptions, component scores, diagnostics where applicable, finite-grid search limits, identifiability, warnings, limitations, and:

```text
priorUsed: false
posteriorComputed: false
```

JSON / plain-text helpers:

```text
reverseResultHandoffToJson
formatReverseResultHandoffPlainText
```

## Reverse statistical boundaries

### Relative likelihood

```text
relativeLikelihoodToBest
```

is a likelihood ratio relative to the best candidate/assignment on the supplied finite candidate space.

It is not posterior probability.

### Impossible transitions

A candidate/assignment that assigns probability zero to a positively observed transition remains impossible.

Finite scalar evidence does not rescue that transition impossibility.

### Scalar predictor non-convergence

A non-converged model-side scalar prediction is not used as successful likelihood evidence.

That candidate/assignment is rejected explicitly.

### Finite-grid identifiability

Current statuses:

```text
unique_best_assignment
tied_best_assignments
no_possible_assignment
```

These statements apply only to the caller-supplied finite eligible grid.

They are not proofs of global structural identifiability over a continuous parameter space.

### Prior / posterior

All current reverse methods remain non-Bayesian:

```text
priorUsed: false
posteriorComputed: false
```

No existing likelihood ratio may be renamed or reinterpreted as posterior probability.

## Third-party forward example path

Representative code:

```text
packages/core/examples/forward_result_handoff.ts
```

Conceptual flow:

```text
JSON model
→ evaluateExternalModelJson
→ toForwardResultHandoff
→ JSON / plain text
```

## Third-party reverse example path

Representative code:

```text
packages/core/examples/multi_parameter_composite_external_handoff.ts
```

Conceptual flow:

```text
JSON reverse request
→ estimateExternalReverseJson
→ toReverseResultHandoff
→ JSON / plain text
```

## Compatibility boundary

The v1 completion declaration is additive and does not remove historical APIs.

In particular:

- direct typed model/solver APIs remain available;
- `ForwardEvaluationResult` remains available;
- existing JSON helpers remain available;
- legacy discrete-specific checked reverse APIs remain available;
- generic checked reverse dispatcher remains preferred for broad third-party input;
- historical TeX/report/boundary helpers remain exported but are not promoted to a complete v1 renderer;
- generated-target diagnostics remain separate from the production solver target policy.

A future breaking cleanup should use an explicit migration/versioning decision rather than silently changing the current v1 boundary.

## Package / release metadata boundary

The repository currently uses development package metadata rather than a publishable npm `1.0.0` package contract.

Therefore:

```text
v1 functional contract
!=
npm package release 1.0.0
```

If distribution becomes a goal, packaging work should separately define:

```text
package name
public/private status
exports map
build output
type declarations
semantic versioning policy
release process
```

That work is not required to consider the current analytical core complete at the v1 functional-contract level.

## Explicitly partial in v1

The following remain useful but partial:

```text
TeX output
historical report / boundary report helpers
state generation diagnostics
transition effects beyond set_property
```

They must not be presented as complete universal renderers or full action systems.

## Explicitly unsupported / post-v1

Do not infer support for:

```text
continuous optimization
adaptive optimization
MCMC
variational inference
Bayesian prior/posterior
confidence or credible intervals
hidden-state inference
automatic unit conversion
general dimensional algebra
correlated scalar errors
general non-Gaussian scalar likelihoods
multi-parameter causal attribution
undefined Shapley allocation
complete GUI / web API product layer
large domain-specific digipachi / Juoh core commitments
```

These may be added only when a concrete use case justifies the semantics and implementation.

## Change policy after v1 completion

New work should be selected by demonstrated analytical or product value rather than by filling a roadmap mechanically.

Before adding a new statistical family, ask:

1. What generic use case cannot be expressed by current contracts?
2. What new mathematical assumption is introduced?
3. Can the capability reuse an existing scorer/solver rather than duplicate semantics?
4. What checked-input boundary is required?
5. What result/handoff semantics are required?
6. What new failure modes and identifiability limits must remain explicit?
7. Does the change require a compatibility or schema-version decision?

## Completion summary

The v1 functional-contract boundary is reached because a third party can now perform both of these complete paths:

```text
forward JSON / unknown
→ checked parsing/resolution/validation
→ integrated forward evaluation
→ structured result
→ versioned ForwardResultHandoff
```

and:

```text
reverse JSON / unknown
→ checked model + observation + request parsing
→ one of five explicit finite reverse contracts
→ structured result
→ versioned ReverseResultHandoff
```

with machine-readable failure stages, explicit solver/statistical boundaries, representative examples, and preserved compatibility.
