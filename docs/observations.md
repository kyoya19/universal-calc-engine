# Observation input surface

## Purpose

Observations are first-class input data for later reverse estimation work.

They are intentionally separate from:

- model definitions
- supplied parameter values
- evaluated model values
- solver results

This boundary does not implement Seikatan inference, likelihood calculation, Bayesian updating, or parameter fitting.

## Dataset shape

Observation datasets are versioned independently:

```json
{
  "schemaVersion": 1,
  "observations": [
    {
      "id": "start-visits",
      "type": "state_count",
      "state": "start",
      "count": 100
    },
    {
      "id": "wins",
      "type": "transition_count",
      "from": "start",
      "to": "win",
      "count": 40
    },
    {
      "id": "elapsed",
      "type": "scalar",
      "metric": "observed_elapsed_time",
      "value": 3600,
      "unit": "seconds"
    }
  ]
}
```

## Observation types

### state_count

Records a non-negative integer count associated with a model state.

```ts
{
  id: string;
  type: 'state_count';
  state: StateId;
  count: number;
}
```

### transition_count

Records a non-negative integer count for an explicit `from -> to` transition present in the model.

```ts
{
  id: string;
  type: 'transition_count';
  from: StateId;
  to: StateId;
  count: number;
}
```

### scalar

Records a named finite scalar metric that may be consumed by a later estimation layer.

```ts
{
  id: string;
  type: 'scalar';
  metric: string;
  value: number;
  unit?: string;
}
```

Scalar metrics are deliberately generic in this phase. This avoids pretending that every future observation has already been mapped to a model parameter or solver output.

## Parsing boundary

Use:

```text
parseObservationDataset
parseObservationDatasetJson
```

JSON text is parsed to `unknown` and then rebuilt into recognized observation records.

Parsing failures distinguish:

```text
json_syntax
shape
```

Examples of shape errors include unsupported observation types or wrong primitive field types.

## Model-linked validation

Use:

```text
validateObservationDataset(dataset, model)
```

Current validation includes:

- non-empty observation IDs
- duplicate observation IDs
- known states for `state_count`
- known explicit transition pairs for `transition_count`
- non-negative integer counts
- non-empty scalar metric names
- finite scalar values
- non-empty scalar units when a unit is supplied

This validation does not infer probabilities or compare observed counts to model expectations. It only establishes that the observation dataset is structurally and referentially usable for a later estimation layer.

## Separation from parameters

A parameter is a value used to define or resolve the model.

An observation is evidence collected from an external run, sample, measurement, or historical record.

For example:

```text
parameter: hitRate = 0.40
observation: wins = 40 of 100 starts
```

These are not interchangeable even when a later estimator may use the observation to infer the parameter.

The current API therefore does not pass observations into `resolveParameterizedDefinitionModel` and does not convert observation records into parameter values.

## Later Seikatan boundary

A later reverse-estimation layer can consume:

```text
parameterized model
+ observation dataset
+ candidate / prior / constraint definitions
→ likelihood or score
→ estimation result
```

That inference behavior is explicitly outside this observation-input PR.

## JSON output

`observationDatasetToJson` serializes a copied observation dataset for external tools.
