# Generated Target Gate Public API

## Purpose

This document records the public reporting API boundary for the generated-target gate.

The API is for validation-gated explicit solving diagnostics. It does not approve generated-target runtime substitution.

## Exported API

The public entry points are exported from `packages/core/src/index.ts` through `generated_target_solver_adapter`.

```ts
solveExpectedRewardWithGeneratedTargetGate(model)
summarizeGeneratedTargetSolverGateResult(result)
formatGeneratedTargetSolverGateResultSummary(summary)
```

## Runtime path

`solveExpectedRewardWithGeneratedTargetGate(model)` follows the v0.6 runtime boundary:

```text
expand generated-target graph
  -> validate generated-target readiness
  -> reject missing generated target before model evaluation
  -> reject explicit/generated mismatch before model evaluation
  -> evaluate the model after acceptance
  -> solve through the existing explicit-target solver
```

The accepted path returns the expanded graph, evaluated model, and solved model.

The rejected path returns the expanded graph and the planning rejection. Rejection occurs before model evaluation and before solver execution.

## Summary helper

`summarizeGeneratedTargetSolverGateResult(result)` converts the gate result into a reporting-oriented summary.

Accepted summary shape:

```ts
{
  accepted: true,
  edgeCount: number,
  generatedTargetReadyEdgeCount: number
}
```

Rejected summary shape:

```ts
{
  accepted: false,
  edgeCount: number,
  generatedTargetReadyEdgeCount: number,
  rejectionCode: 'missing_generated_target' | 'explicit_generated_mismatch',
  rejectionType: 'missing_generated_target' | 'explicit_generated_mismatch',
  rejectionMessage: string
}
```

## Formatter helper

`formatGeneratedTargetSolverGateResultSummary(summary)` converts a gate summary into a stable line-oriented diagnostic string.

Accepted formatter output shape:

```text
accepted: true
edgeCount: 4
generatedTargetReadyEdgeCount: 4
```

Rejected formatter output shape:

```text
accepted: false
edgeCount: 4
generatedTargetReadyEdgeCount: 3
rejectionCode: missing_generated_target
rejectionType: missing_generated_target
rejectionMessage: Generated target is missing for edge from position_0 to position_1
```

The formatter is intentionally summary-based. It does not inspect or modify the model, graph, evaluated model, solved model, solver target, or contribution target.

## Stable reporting fields

`accepted` is the primary branch field.

`edgeCount` is the total expanded edge count.

`generatedTargetReadyEdgeCount` is the number of expanded edges with `generatedTo` present.

`rejectionCode` is the stable machine-facing failure field for rejected summaries.

`rejectionType` mirrors the planning rejection type for compatibility.

`rejectionMessage` is the human-facing explanation.

## Usage sequence

The recommended reporting sequence is:

```ts
const result = solveExpectedRewardWithGeneratedTargetGate(model);
const summary = summarizeGeneratedTargetSolverGateResult(result);
const diagnosticText = formatGeneratedTargetSolverGateResultSummary(summary);
```

Accepted results may then be used with the existing explicit-target solver output contained in the accepted gate result.

Rejected results should be reported from the summary or formatted diagnostic text without evaluating or solving the model.

## Preserved target semantics

The solver target remains:

```text
solver target = transition.to
```

The contribution target remains:

```text
contribution target = transition.to
```

`generatedTo` is a diagnostic and validation field. It is not a solver target and is not a contribution output target.

## Out of scope

This API documentation does not change or approve:

- generated-target runtime substitution,
- `generated_candidate_as_solver_target` as a runtime policy,
- solving against `generatedTo`,
- contribution output against `generatedTo`,
- fallback from missing generated targets to explicit targets,
- acceptance of explicit/generated mismatches,
- representative Sugoroku expected reward baseline changes.
