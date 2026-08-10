# Checked external reverse-estimation input

## Purpose

This boundary makes the minimal discrete Seikatan estimator reachable from `unknown` / JSON input without treating `JSON.parse` as type validation.

It does not change the likelihood method implemented by `discrete_estimation.ts`. It only composes existing checked model input, ObservationDataset parsing, request-shape parsing, and discrete candidate estimation.

## Versioned envelope

The external reverse document is:

```json
{
  "schemaVersion": 1,
  "estimationKind": "discrete_parameter_candidates",
  "modelDocument": {
    "schemaVersion": 1,
    "modelKind": "base",
    "model": {}
  },
  "observationDataset": {
    "schemaVersion": 1,
    "observations": []
  },
  "request": {
    "parameterId": "successProbability",
    "candidates": [0.4, 0.5, 0.6],
    "constraints": [
      { "type": "minimum", "value": 0 },
      { "type": "maximum", "value": 1 }
    ]
  }
}
```

The nested model document uses the existing external model parser.

The nested observation dataset uses the existing ObservationDataset parser.

The reverse request supports the existing discrete-estimation request shape:

```text
parameterId
candidates
optional minimum / maximum constraints
```

## Entry points

```text
parseExternalDiscreteEstimationDocument
parseExternalDiscreteEstimationJson
estimateExternalDiscreteParameterInput
estimateExternalDiscreteParameterJson
externalDiscreteEstimationResultToJson
```

## Stages

Failures are separated into:

```text
json_syntax
shape
estimation
```

### json_syntax

The complete text is not valid JSON.

### shape

The JSON exists but the envelope or one of its nested typed surfaces has an invalid primitive or discriminant shape.

Examples:

- unsupported reverse `schemaVersion`;
- unsupported `estimationKind`;
- malformed nested external model document;
- malformed nested ObservationDataset;
- `parameterId` is not a string;
- candidate is not a finite number;
- constraint type is not `minimum` / `maximum`;
- constraint value is not finite;
- `inclusive`, when present, is not boolean.

Nested paths are preserved under the envelope, for example:

```text
$.modelDocument.model.startState
$.observationDataset.observations[0].count
$.request.constraints[0].inclusive
```

### estimation

The input is structurally typed, but the existing estimator rejects its meaning or observation contract.

The result keeps the estimator's own stage separately as `estimationStage`, including:

```text
request
observation_validation
observation_likelihood_contract
candidate_evaluation
```

Examples:

- duplicate candidate values;
- unknown estimation parameter;
- invalid observed model references;
- state_count / transition_count departure totals do not match;
- every candidate is excluded or model-invalid.

This separation keeps parser shape rules distinct from estimator semantics.

## No silent normalization

The parser does not:

- deduplicate candidate values;
- sort candidates;
- clip candidates to constraints;
- infer a missing state_count;
- convert scalar observations into parameter values;
- infer priors;
- normalize likelihood ratios into posterior probabilities.

For example, duplicate finite candidates are valid primitive JSON shape but fail later under the estimator's `request` contract.

## Statistical semantics

This boundary does not define a new statistical method.

The underlying estimator remains:

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

with:

```text
priorUsed: false
posteriorComputed: false
```

`relativeLikelihoodToBest` remains a likelihood ratio to the best candidate and is not a posterior probability.

## Compatibility

This feature is additive.

It does not change:

- `ExternalModelDocument`;
- `ObservationDataset`;
- `DiscreteParameterEstimationRequest`;
- the current conditional transition likelihood;
- forward evaluation;
- scenario comparison;
- one-at-a-time sensitivity.

Typed callers may continue to call `estimateDiscreteParameterCandidates` directly.

## Third-party reverse path

```text
external JSON / unknown
→ reverse envelope shape check
→ nested model shape check
→ nested ObservationDataset shape check
→ typed discrete request
→ existing observation / estimation contracts
→ discrete candidate likelihood ranking
→ structured result
```

This closes the main third-party input gap of the first minimal Seikatan PoC without expanding into a larger inference engine.
