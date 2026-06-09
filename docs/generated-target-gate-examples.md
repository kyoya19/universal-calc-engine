# Generated Target Gate Examples

## Purpose

This document shows the expected accepted and rejected outputs for the generated-target solver gate.

The examples document the current v0.6 boundary only. They do not approve runtime target substitution.

## Current boundary

The approved runtime path remains:

```text
solveExpectedRewardWithGeneratedTargetGate(model)
  -> validate generated-target readiness
  -> reject missing generated targets before model evaluation
  -> reject explicit/generated mismatches before model evaluation
  -> run the existing explicit-target solver only after acceptance
```

The solver and contribution targets remain:

```text
solver target = transition.to
contribution target = transition.to
```

## Accepted example

An accepted model is one where every expanded edge has a generated target and every generated target matches its explicit target.

Example summary shape:

```ts
{
  accepted: true,
  edgeCount: 4,
  generatedTargetReadyEdgeCount: 4
}
```

After acceptance, the wrapper calls the existing explicit-target solver.

The representative Sugoroku baseline remains:

```text
start: 2.25
position 1: 1.5
position 2: 1
position 3: 0
```

## Rejected example: missing generated target

A model is rejected when an expanded edge has no generated target.

Example summary shape:

```ts
{
  accepted: false,
  edgeCount: 4,
  generatedTargetReadyEdgeCount: 3,
  rejectionCode: 'missing_generated_target',
  rejectionType: 'missing_generated_target',
  rejectionMessage: 'Generated target is missing for edge from position_0 to position_1'
}
```

This rejection occurs before model evaluation and before solver execution.

## Rejected example: explicit/generated mismatch

A model is rejected when an expanded edge has a generated target but it differs from the explicit target.

Example summary shape:

```ts
{
  accepted: false,
  edgeCount: 4,
  generatedTargetReadyEdgeCount: 4,
  rejectionCode: 'explicit_generated_mismatch',
  rejectionType: 'explicit_generated_mismatch',
  rejectionMessage: 'Explicit target legacy_pos_1 differs from generated target position_1'
}
```

This rejection also occurs before model evaluation and before solver execution.

## Compatibility note

`rejectionCode` is the stable machine-facing failure field.

`rejectionType` remains available for compatibility with the existing planning rejection type.

## Out of scope

These examples do not change or approve:

- generated-target runtime substitution,
- `generated_candidate_as_solver_target`,
- solver target selection from `generatedTo`,
- contribution output target selection from `generatedTo`,
- expected reward baseline changes.
