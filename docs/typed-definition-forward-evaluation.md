# Typed DefinitionModel forward evaluation

## Purpose

The forward v1 facade now accepts an already-typed `DefinitionModel` directly without routing that model through external JSON parsing or external parameter resolution.

The end-to-end typed path is:

```text
FiniteDecisionProcess<State>
+
caller-supplied DeterministicDecisionPolicy<State>
↓
materializeFiniteDecisionPolicy
↓
DefinitionModel
↓
evaluateDefinitionModel
↓
ForwardEvaluationResult
↓
toForwardResultHandoff
↓
ForwardResultHandoff schemaVersion: 1
```

This is an additive entrypoint. It does not change the external-input APIs or their result semantics.

## Public API

```text
evaluateDefinitionModel(
  model: DefinitionModel,
  options?: ForwardEvaluationOptions
): ForwardEvaluationResult
```

The function is exported through the existing `forward_evaluation` package-root export.

## Validation

A typed `DefinitionModel` is first passed to:

```text
validateDefinitionModel
```

Invalid models return the existing structured `ForwardEvaluationFailure` shape with:

```text
stage: model_validation
validation: ModelValidationResult
issues: ForwardEvaluationIssue[]
```

Validation issue paths use the same `$.model...` prefix as the external-input preparation path so the typed and external routes expose the same failure semantics for the same resolved model.

## Shared forward calculation path

A valid typed model and an externally prepared base model both enter the same internal base-model evaluation helper.

That shared path uses the existing:

```text
expandModel
evaluateModel
solveExpectedRewardWithDiagnostics
solveExpectedElapsedTimeWithDiagnostics
toRewardRateResult
toContributionResult
solveReachabilityProbabilityWithDiagnostics
```

The typed entrypoint does not duplicate expected-value, elapsed-time, reward-rate, contribution, reachability, or solver-diagnostics algorithms.

## Compatibility target

For the same resolved `DefinitionModel` and `ForwardEvaluationOptions`:

```text
evaluateDefinitionModel(model, options)
```

and:

```text
evaluateExternalModelInput(
  schemaVersion-1 base document representing the same model,
  options
)
```

produce the same `ForwardEvaluationResult` for:

```text
expected reward
expected elapsed time
reward rate
contribution
reachability
solver diagnostics
validation
option failures
```

## Decision-process bridge

The typed entrypoint completes the fixed-policy decision-process bridge introduced by finite decision materialization.

The decision layer still requires a caller-supplied deterministic policy. No policy is inferred from `bestActionIdsByState`, and no implicit tie-breaking is introduced.

A materialized model can now flow directly into the standard forward result and existing versioned handoff without creating a decision-specific handoff schema.

## Unchanged contracts

This increment does not change:

```text
DefinitionModel
TransitionDefinition
transition.to semantics
FiniteDecisionProcess P0
DeterministicDecisionPolicy
materializeFiniteDecisionPolicy
ExternalModelDocument schemaVersion: 1
ForwardEvaluationResult semantics
ForwardResultHandoff schemaVersion: 1
Seikatan reverse contracts
```

## Deliberately not added

```text
DecisionResultHandoff
ExternalDecisionProcessDocument
external decision-process JSON
optimal-policy automatic materialization
implicit tie-breaking
cyclic MDP support
value iteration
policy iteration
reward-rate optimization changes
domain-specific production types
```
