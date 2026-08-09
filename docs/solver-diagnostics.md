# Solver convergence diagnostics

## Purpose

The existing forward solvers keep their current public behavior and defaults:

- maximum iterations: `10_000`
- convergence tolerance: `1e-12`
- non-convergence: throw the existing solver-specific error

The diagnostics API is additive. It gives callers a machine-readable view of convergence without changing the legacy solver result contracts.

## Detailed solvers

The current diagnostic entry points are:

```text
solveExpectedRewardWithDiagnostics
solveReachabilityProbabilityWithDiagnostics
solveExpectedElapsedTimeWithDiagnostics
solveExpectedRewardAxesWithDiagnostics
```

Single-result solvers return:

```ts
{
  result,
  diagnostics: {
    solverKind,
    converged,
    iterations,
    maxIterations,
    tolerance,
    lastMaxDelta,
    context?
  }
}
```

The named reward-axis solver returns one diagnostic per axis because each axis is solved independently.

## Context

Context is included only when it changes the meaning of the run.

Reachability diagnostics include:

```ts
{
  targetStates: ['win']
}
```

Named reward-axis diagnostics include:

```ts
{
  rewardAxisId: 'revenue'
}
```

## Non-convergence behavior

The detailed API does not throw merely because the configured iteration limit was reached.

Instead it returns:

```ts
{
  converged: false,
  iterations: maxIterations,
  lastMaxDelta,
  result: /* last approximate state */
}
```

This lets a caller inspect the last approximation and decide whether to reject it, display diagnostics, retry with a larger limit, or change the model.

Input errors such as an unknown reachability target still throw because they are not convergence outcomes.

## Options

Diagnostic runs can override:

```ts
{
  maxIterations?: number,
  tolerance?: number
}
```

The defaults match the existing solvers exactly.

`maxIterations` must be a positive integer. `tolerance` must be finite and positive.

## Compatibility boundary

This PR does not route the legacy solvers through the new internal runner.

That is deliberate. Replacing the existing loops would mix two changes:

1. adding observable diagnostics,
2. refactoring established solver internals.

The focused tests instead verify that converged detailed results match the existing solver results for expected reward, reachability, expected elapsed time, and named reward axes.

A later refactor may unify the legacy and diagnostic implementations after the diagnostics contract is stable.

## JSON boundary

`solverConvergenceDiagnosticsToJson` serializes one diagnostic object for external tools and UI layers.
