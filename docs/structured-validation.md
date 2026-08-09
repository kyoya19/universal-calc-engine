# Structured model validation

## Purpose

Third-party callers should be able to inspect invalid model input without parsing exception text.

The structured validation API is additive. Existing expansion and evaluation functions keep their current exception behavior.

## Result shape

Validation returns:

```ts
{
  valid: boolean;
  issues: ModelValidationIssue[];
  errors: ModelValidationIssue[];
  warnings: ModelValidationIssue[];
}
```

Each issue contains:

```ts
{
  code: ModelValidationIssueCode;
  severity: 'error' | 'warning';
  path: string;
  message: string;
}
```

`valid` means that there are no error-severity issues. Warnings do not make the model invalid.

## Base model validation

Use:

```text
validateDefinitionModel
```

The current checks include:

- duplicate state IDs
- unknown start state
- unknown transition source or target
- non-finite or out-of-range probability
- non-finite legacy reward
- negative or non-finite elapsed time
- outgoing transition probability totals for non-terminal states
- terminal states with outgoing transitions as a warning because current solvers ignore them

When an individual transition probability is already invalid, the validator does not also emit a probability-total error for that state. This avoids reporting one malformed value twice through dependent errors.

## Named reward-axis validation

Use:

```text
validateRewardAxesDefinitionModel
```

It includes the base model checks and adds:

- duplicate reward-axis IDs
- empty reward-axis units
- transition values for undeclared axes
- non-finite reward-axis values

## Compatibility boundary

Validation does not automatically call `expandModel`, `evaluateModel`, or solver functions.

This is intentional. A caller can choose either workflow:

```text
validate → inspect issues → stop or continue
```

or the existing exception-based workflow:

```text
expand → evaluate → solve
```

A later API may provide an explicit validated pipeline, but this PR does not silently change the failure behavior of existing entry points.

## JSON boundary

`modelValidationResultToJson` serializes the structured result for external tools and UI layers.
