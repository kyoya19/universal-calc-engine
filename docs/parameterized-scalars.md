# Parameter references and formula scalars

## Purpose

The core `DefinitionModel` keeps its current scalar contract. Parameter references and formulas are resolved in a separate pre-evaluation layer, then converted into the existing model types.

This allows one model structure to be evaluated repeatedly with different named input values without changing the established solver pipeline.

## Parameter definitions

A parameter can carry descriptive metadata and an optional default:

```ts
{
  id: 'hitRate',
  label: 'Hit rate',
  unit: 'probability',
  defaultValue: 0.25
}
```

A default can itself refer to another parameter or use a formula.

Supplied values override defaults.

## Parameter references

Use an explicit scalar node:

```ts
{
  type: 'parameter_ref',
  parameter: 'hitRate'
}
```

Parameter references can be used in:

- transition probability
- legacy scalar reward
- elapsed-time value
- named reward-axis values
- parameter defaults
- formula operands

## Formula scalars

Formula scalars use an explicit expression tree rather than string evaluation:

```ts
{
  type: 'formula',
  operator: 'subtract',
  left: 1,
  right: {
    type: 'parameter_ref',
    parameter: 'hitRate'
  }
}
```

Supported operators are:

- `add`
- `subtract`
- `multiply`
- `divide`

Formula results must be finite. Division by zero therefore fails resolution instead of silently producing infinity.

The formula layer currently handles numeric relationships only. Parameter `unit` metadata is descriptive; automatic dimensional analysis or unit conversion is not performed.

## Resolution pipeline

Base model:

```text
ParameterizedDefinitionModel
→ resolveParameterizedDefinitionModel
→ DefinitionModel
→ expandModel
→ evaluateModel
→ existing forward solvers
```

Named reward axes:

```text
ParameterizedRewardAxesDefinitionModel
→ resolveParameterizedRewardAxesDefinitionModel
→ RewardAxesDefinitionModel
→ expandRewardAxesModel
→ evaluateRewardAxesModel
→ solveExpectedRewardAxes
```

The resolver does not replace the existing model or solver APIs.

## Repeated evaluation

The same parameterized model can be resolved more than once:

```text
model + { hitRate: 0.25 } → result A
model + { hitRate: 0.40 } → result B
```

This is the intended foundation for later sensitivity analysis, scenario comparison, external input templates, and reverse-estimation preparation.

## Resolution failures

Resolution rejects:

- empty parameter IDs
- duplicate parameter IDs
- supplied values for undeclared parameters
- missing required parameter values
- references to undeclared parameters
- circular parameter defaults
- non-finite supplied values
- non-finite formula results

These are parameter-resolution errors. Existing structured model validation still applies after resolution to model-level constraints such as probability ranges and transition totals.

## Compatibility boundary

This feature does not add `parameter_ref` or `formula` directly to the existing core `ScalarSpec` union.

That separation avoids changing every established scalar consumer at once. The parameterized layer resolves its richer scalar nodes into ordinary numeric `DefinitionModel` values before the existing pipeline runs.
