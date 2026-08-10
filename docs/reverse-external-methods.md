# Checked external input for reverse estimation methods

## Purpose

The reverse layer has multiple typed production estimators. This boundary lets third-party callers submit `unknown` values or JSON without treating `JSON.parse()` success as type validation.

The existing discrete-specific checked API remains unchanged. This document covers the additive generic dispatcher.

## Public entry points

```text
parseExternalReverseEstimationDocument
parseExternalReverseEstimationJson
estimateExternalReverseInput
estimateExternalReverseJson
```

## Version and discriminant

Every document has:

```text
schemaVersion: 1
estimationKind: ...
modelDocument: ...
observationDataset: ...
request: ...
```

Supported `estimationKind` values are now:

```text
discrete_parameter_candidates
scalar_gaussian_parameter_candidates
composite_parameter_candidates
multi_parameter_transition_grid
multi_parameter_composite_grid
```

The generic dispatcher does not replace the typed APIs:

```text
estimateDiscreteParameterCandidates
estimateScalarGaussianParameterCandidates
estimateCompositeParameterCandidates
estimateMultiParameterGrid
estimateMultiParameterCompositeGrid
```

It also does not replace the existing checked discrete-specific functions.

## Failure stages

The checked boundary separates:

```text
json_syntax
shape
estimation
```

### json_syntax

The input string is not valid JSON.

### shape

The JSON value is syntactically valid but does not have the required structural types or discriminants.

Examples:

- unsupported `schemaVersion` or `estimationKind`;
- nested model or observation shape failure;
- candidate value is not a finite number;
- scalar predictor discriminant is unsupported;
- Gaussian error-model primitive has the wrong type;
- `maxCombinations` is not a finite number;
- composite independence discriminant is missing or unsupported.

### estimation

The request is structurally typed, but an estimator-specific semantic rule fails.

Examples:

- duplicate candidate values;
- empty candidate sets;
- Gaussian `standardDeviation <= 0`;
- predictor / observation / error-model unit mismatch;
- unknown declared estimation parameter;
- incomplete transition departure counts;
- candidate grid larger than explicit `maxCombinations`;
- model-invalid candidate or assignment;
- scalar prediction non-convergence.

The result preserves the underlying estimator stage through `estimationStage`.

## Parser non-normalization contract

The parser must not repair or reinterpret statistical input.

It does not:

```text
deduplicate candidate values
truncate or sample Cartesian grids
invent Gaussian sigma
replace zero sigma with epsilon
infer predictor from observation metric
convert units
auto-clip candidate values to constraints
infer transition/scalar evidence partition
infer the composite conditional-independence assumption
copy observations into model parameters
```

These decisions either remain estimator semantics or require explicit caller input.

For example, duplicate finite candidate values and zero finite Gaussian sigma pass the primitive shape stage, then fail in the typed estimator. An oversized finite grid is not truncated; it reaches the estimator and fails against `maxCombinations`.

## Nested model and observation reuse

The generic reverse parser reuses the existing checked boundaries for:

```text
ExternalModelDocument
ObservationDataset
```

Nested issue paths are therefore reported under:

```text
$.modelDocument...
$.observationDataset...
```

rather than introducing a second model or observation schema.

## Scalar Gaussian request shape

A scalar request includes the existing finite single-parameter candidate fields plus:

```text
scalarLikelihoods[]
```

Each binding requires:

```text
observationId
predictor
errorModel
```

Current predictor discriminants remain:

```text
expected_elapsed_time_seconds
reward_axis_expected_value
```

The reward-axis predictor also requires an explicit `axisId`.

The error model remains:

```text
type: gaussian
standardDeviation: finite number
unit: string
```

The shape parser accepts zero or negative finite standard deviation as structurally numeric; the scalar estimator then rejects it semantically.

## Single-parameter composite request shape

The single-parameter composite checked request contains:

```text
parameterId
candidates
constraints?
transitionObservationIds
scalarLikelihoods
independenceAssumption
solver?
```

The independence discriminant must be supplied explicitly as:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

The parser does not infer this assumption.

Evidence partition correctness remains the composite estimator's semantic responsibility after shape parsing.

## Multi-parameter transition grid request shape

The checked transition grid request contains:

```text
parameters[]
  parameterId
  candidates[]
  optional constraints[]
maxCombinations
```

`maxCombinations` must be a finite number at the shape boundary. Positive safe-integer requirements and actual Cartesian-size enforcement remain estimator semantics.

The parser never truncates an oversized grid.

## Multi-parameter composite grid request shape

The fifth checked kind combines the finite grid request shape with the existing composite evidence contract:

```text
estimationKind: multi_parameter_composite_grid
request:
  parameters[]
    parameterId
    candidates[]
    constraints?
  maxCombinations
  transitionObservationIds[]
  scalarLikelihoods[]
  independenceAssumption
  solver?
```

The parser reuses the same primitives used by the existing scalar, composite, and transition-grid envelopes. It does not define a second candidate or scalar-likelihood schema.

The only supported evidence-block independence discriminant is still:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

After shape parsing, the typed `estimateMultiParameterCompositeGrid` remains responsible for:

```text
2+ distinct declared parameter dimensions
candidate uniqueness
constraint semantics
positive safe maxCombinations
raw / eligible Cartesian limits
evidence partition contract
scalar sigma positivity and unit agreement
model validation
transition impossible events
scalar solver convergence
assignment ranking and finite-grid identifiability
```

No grid normalization or statistical repair is added at the external boundary.

## Compatibility

The pre-existing API remains valid:

```text
parseExternalDiscreteEstimationDocument
parseExternalDiscreteEstimationJson
estimateExternalDiscreteParameterInput
estimateExternalDiscreteParameterJson
```

Existing callers do not need to migrate to the generic dispatcher.

The first four generic kinds retain their existing wire discriminants and request shapes. The fifth kind is additive.

## Statistical boundary

Adding checked external input does not change any likelihood formula, independence assumption, search method, prior rule, or posterior rule.

In particular:

```text
relativeLikelihoodToBest != posterior probability
priorUsed remains false
posteriorComputed remains false
```

for all current reverse methods, including the multi-parameter composite grid.
