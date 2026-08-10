# Typed forward solver dispatcher

## Purpose

The core exposes two separate typed forward paths for `DefinitionModel` values:

```text
evaluateDefinitionModel
→ existing iterative forward-v1 evaluation

evaluateAcyclicDirectDefinitionModel
→ explicit acyclic direct evaluation
```

This increment adds a thin typed dispatcher so a caller can choose one of those existing paths explicitly without changing either underlying contract.

## Public API

```text
evaluateDefinitionModelWithSolver(
  model: DefinitionModel,
  request: ForwardSolverRequest
): ForwardSolverEvaluationResult
```

The request is a tagged union:

```text
{
  solverMethod: 'iterative',
  options?: ForwardEvaluationOptions
}
```

or:

```text
{
  solverMethod: 'acyclic_direct',
  options?: AcyclicDirectOptions
}
```

The result keeps the same method identity:

```text
{
  solverMethod: 'iterative',
  result: ForwardEvaluationResult
}
```

or:

```text
{
  solverMethod: 'acyclic_direct',
  result: AcyclicDirectForwardResult
}
```

## Delegation only

The dispatcher contains no numerical solver logic.

An explicit iterative request calls:

```text
evaluateDefinitionModel(model, options)
```

An explicit direct request calls:

```text
evaluateAcyclicDirectDefinitionModel(model, options)
```

Expected reward, elapsed time, reward rate, contribution, reachability, validation, diagnostics, and failure semantics remain owned by those existing paths.

## No automatic selection

`solverMethod` is mandatory in the typed request.

The dispatcher does not inspect the graph and does not choose a solver automatically.

In particular, it does not implement:

```text
acyclic graph → direct automatically
cyclic graph → iterative automatically
```

The caller chooses the method.

## No fallback

An explicit `acyclic_direct` request that reaches a cyclic effective dependency graph preserves the existing direct failure:

```text
failure.code: cycle_detected
```

It does not retry with the iterative solver.

Likewise, iterative requests never switch to the direct solver.

## Diagnostics boundary

The wrapper deliberately keeps the underlying result untouched.

Iterative evaluation continues to expose existing convergence diagnostics.

Direct evaluation continues to expose:

```text
AcyclicDirectDiagnostics
```

with:

```text
solverMethod: topological_reverse_dynamic_programming
simulationUsed: false
numericRepresentation: javascript_number_float64
```

and without fake convergence iteration fields.

The outer `solverMethod` tag identifies which public evaluation path was selected; it does not replace the solver-specific diagnostics inside the result.

## Output parity

For an acyclic model that both methods can evaluate, focused tests compare:

```text
expected reward
expected elapsed time
reward rate
contribution
reachability
```

The dispatcher itself does not perform those comparisons or alter the values.

## Failure preservation

Each branch preserves its existing failure surface.

Examples:

```text
iterative invalid model
→ ForwardEvaluationFailure(stage: model_validation)

direct invalid model
→ AcyclicDirectEvaluationFailure(failure.code: model_validation_failed)
```

and:

```text
iterative unknown reachability target
→ ForwardEvaluationFailure(stage: evaluation_options)

direct unknown reachability target
→ AcyclicDirectEvaluationFailure(failure.code: unknown_reachability_target)
```

No cross-method failure translation is introduced.

## Decision-process bridge

The fixed-policy typed route can now be selected explicitly:

```text
FiniteDecisionProcess
+
caller-supplied DeterministicDecisionPolicy
↓
materializeFiniteDecisionPolicy
↓
DefinitionModel
↓
evaluateDefinitionModelWithSolver
├─ iterative
└─ acyclic_direct
```

Focused tests evaluate the same materialized model through both explicit methods and compare forward outputs, while also comparing reward and elapsed time with the P0 fixed-policy result.

## Existing contracts remain unchanged

This increment does not change:

```text
DefinitionModel
TransitionDefinition
ForwardEvaluationOptions
ForwardEvaluationResult
evaluateDefinitionModel default behavior
evaluateExternalModelInput / evaluateExternalModelJson
AcyclicDirectOptions
AcyclicDirectForwardResult
ForwardResultHandoff schemaVersion: 1
ExternalModelDocument schemaVersion: 1
FiniteDecisionProcess P0
materializeFiniteDecisionPolicy
Seikatan reverse contracts
```

## Deliberately not added

```text
automatic solver selection
implicit direct/iterative fallback
ForwardEvaluationOptions solverMethod
ForwardResultHandoff changes
DecisionResultHandoff
external decision-process JSON
cyclic MDP optimality
value iteration changes
policy iteration
Monte Carlo fallback
rational arithmetic
domain-specific production types
```
