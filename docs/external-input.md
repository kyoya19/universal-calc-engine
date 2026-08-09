# External model input boundary

## Purpose

This boundary is the JSON-facing entry point for third-party model input.

It does not treat `JSON.parse` as type validation. Parsed `unknown` values are checked and rebuilt into recognized parameterized model shapes before parameter resolution or model validation runs.

## Document envelope

External model documents use an explicit version and model kind:

```json
{
  "schemaVersion": 1,
  "modelKind": "base",
  "parameterValues": {
    "hitRate": 0.4,
    "payout": 200
  },
  "model": {
    "startState": "start",
    "states": [
      { "id": "start" },
      { "id": "win", "terminal": true },
      { "id": "lose", "terminal": true }
    ],
    "parameters": [
      { "id": "hitRate" },
      { "id": "payout", "unit": "JPY" }
    ],
    "transitions": [
      {
        "from": "start",
        "to": "win",
        "probability": {
          "type": "parameter_ref",
          "parameter": "hitRate"
        },
        "reward": {
          "type": "parameter_ref",
          "parameter": "payout"
        }
      },
      {
        "from": "start",
        "to": "lose",
        "probability": {
          "type": "formula",
          "operator": "subtract",
          "left": 1,
          "right": {
            "type": "parameter_ref",
            "parameter": "hitRate"
          }
        }
      }
    ]
  }
}
```

`modelKind` is one of:

- `base`
- `reward_axes`

Named reward-axis documents use the same envelope and parameter scalar syntax, with `rewardAxes` and `rewardsByAxis` inside the model.

## Failure stages

Input failures are intentionally separated:

```text
json_syntax
shape
parameter_resolution
model_validation
```

### json_syntax

The text is not valid JSON.

Example code:

```text
invalid_json
```

### shape

The JSON value exists, but it is not a recognized external model document shape.

Examples include:

- unsupported `schemaVersion`
- invalid `modelKind`
- missing arrays or strings
- unsupported scalar node type
- unsupported formula operator
- invalid time unit
- invalid reward-axis kind

Shape issues include a machine-readable `code`, a JSON-style `path`, and a message.

Shape parsing does not decide graph semantics such as whether a transition target exists or outgoing probabilities total one. Those belong to model validation after parameter resolution.

### parameter_resolution

The document shape is valid, but parameter/formula resolution fails.

Examples include:

- missing required parameter value
- unknown supplied parameter
- unknown parameter reference
- circular parameter defaults
- non-finite formula result

The current parameter resolver is exception-based, so this boundary maps a resolution exception to the explicit `parameter_resolution` stage without parsing the exception text to infer another stage.

### model_validation

Parameter resolution succeeded, but the resulting ordinary `DefinitionModel` or `RewardAxesDefinitionModel` is semantically invalid.

This stage reuses the structured validation API. Examples include:

- unknown start state
- unknown transition state
- invalid probability range
- outgoing probability total not equal to one
- invalid elapsed time
- undeclared reward axis

The preparation result includes both mapped external issues and the original `ModelValidationResult`.

Warnings remain non-fatal, matching structured validation semantics.

## Entry points

```text
parseExternalModelDocument
parseExternalModelDocumentJson
prepareExternalModelDocument
prepareExternalModelInput
prepareExternalModelJson
externalModelPreparationResultToJson
```

Recommended third-party flow:

```text
JSON text
→ parseExternalModelDocumentJson
→ shape-checked ExternalModelDocument
→ parameter resolution
→ structured model validation
→ resolved DefinitionModel / RewardAxesDefinitionModel
→ expand
→ evaluate
→ solve
```

`prepareExternalModelJson` performs the parse, resolution, and validation stages and returns the resolved model only when all fatal stages succeed.

## Security and execution boundary

The input format does not accept executable source text.

Formula input is limited to the explicit expression-tree operators already supported by parameterized scalars:

- add
- subtract
- multiply
- divide

No string `eval`, dynamic function construction, or arbitrary code execution is introduced by this boundary.

## Compatibility

This boundary is additive.

It does not change:

- `DefinitionModel`
- `ScalarSpec`
- existing expand/evaluate behavior
- existing solver result contracts
- existing structured validation semantics

The purpose is to make those existing layers reachable from untrusted/unknown JSON-shaped input through an explicit checked boundary.
