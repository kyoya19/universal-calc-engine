# Generated Target Comparison Report Shape

## Purpose

This document defines the reporting shape for explicit/generated target comparisons.

The report is diagnostic-only. It does not implement generated-target runtime substitution and does not make `generatedTo` executable.

## Source data

The comparison report is derived from expanded graph edges.

Each row should describe the relationship between:

```text
explicit target = transition.to
generated target = generatedTo
```

The report may expose both values for debugging and UX, but only the explicit target remains executable by the solver and contribution output.

## Row shape

A comparison row should contain:

```ts
{
  from: string,
  explicitTo: string,
  generatedTo?: string,
  status: 'match' | 'missing_generated_target' | 'explicit_generated_mismatch'
}
```

## Status meanings

`match` means `generatedTo` exists and equals `explicitTo`.

`missing_generated_target` means `generatedTo` is absent for the expanded edge.

`explicit_generated_mismatch` means `generatedTo` exists but differs from `explicitTo`.

## Report shape

A comparison report should contain:

```ts
{
  edgeCount: number,
  matchCount: number,
  missingGeneratedTargetCount: number,
  explicitGeneratedMismatchCount: number,
  rows: GeneratedTargetComparisonReportRow[]
}
```

## Relationship to gate summaries

The comparison report is more detailed than `GeneratedTargetSolverGateResultSummary`.

The gate summary answers whether the gate accepted or rejected the graph.

The comparison report answers which expanded edges matched, missed generated targets, or mismatched explicit/generated targets.

## Acceptance interpretation

A report is gate-acceptable only when:

```text
missingGeneratedTargetCount = 0
explicitGeneratedMismatchCount = 0
```

This interpretation is diagnostic. The actual gate decision remains owned by the generated-target gate validation path.

## Preserved target semantics

The solver target remains:

```text
solver target = transition.to
```

The contribution target remains:

```text
contribution target = transition.to
```

`generatedTo` remains diagnostic data. It is not a solver target and is not a contribution output target.

## Out of scope

This report shape does not change or approve:

- generated-target runtime substitution,
- `generated_candidate_as_solver_target` as a runtime policy,
- solving against `generatedTo`,
- contribution output against `generatedTo`,
- fallback from missing generated targets to explicit targets,
- acceptance of explicit/generated mismatches,
- expected reward baseline changes.

## Safe implementation sequence

The safe implementation sequence is:

1. add the comparison report row and report types,
2. derive rows from expanded graph edges,
3. add count totals from row statuses,
4. add regression tests for match, missing generated target, and mismatch rows,
5. add formatter or UX output only after the report shape is covered by tests.
