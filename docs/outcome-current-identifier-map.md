# 成果還元関数 current identifier map

この文書は、成果還元関数のcode-level renameへ進む前に、現行識別子を照合した結果を固定します。

この段階ではコードを書き換えません。

## Core model surface

| Current identifier | File | Rename risk | Note |
| --- | --- | --- | --- |
| `DefinitionModel` | `packages/core/src/model.ts` | high | public model surface |
| `ExpandedModel` | `packages/core/src/model.ts` | high | public model surface |
| `EvaluatedModel` | `packages/core/src/model.ts` | high | public model surface |
| `SolvedModel` | `packages/core/src/model.ts` | high | public model surface |
| `OutputResult` | `packages/core/src/model.ts` | high | serialized output-facing result |
| `ContributionResult` | `packages/core/src/model.ts` | high | contribution output-facing result |
| `solveExpectedReward` | `packages/core/src/model.ts` | high | behavior-facing solver function |
| `toOutputResult` | `packages/core/src/model.ts` | high | output conversion boundary |
| `toContributionResult` | `packages/core/src/model.ts` | high | contribution conversion boundary |
| `selectExplicitSolverTransitionTarget` | `packages/core/src/model.ts` | medium | internal helper, but solver behavior-adjacent |

## State generation surface

| Current identifier | File | Rename risk | Note |
| --- | --- | --- | --- |
| `StateCandidate` | `packages/core/src/state_generation.ts` | medium | generated state candidate type |
| `ExpandedStateEdge` | `packages/core/src/state_generation.ts` | medium | graph edge shape |
| `StateExpansionDiagnostic` | `packages/core/src/state_generation.ts` | medium | diagnostic output shape |
| `ExpandedStateGraph` | `packages/core/src/state_generation.ts` | medium | graph output shape |
| `StateGraphSummary` | `packages/core/src/state_generation.ts` | medium | summary output shape |
| `SerializedStateGraphSummary` | `packages/core/src/state_generation.ts` | high | serialized summary shape |
| `GraphTargetPolicy` | `packages/core/src/state_generation.ts` | medium | target selection policy |
| `StateSpaceExpansionOptions` | `packages/core/src/state_generation.ts` | medium | expansion options |
| `selectGraphTarget` | `packages/core/src/state_generation.ts` | high | previously fixed boundary |
| `expandStateSpace` | `packages/core/src/state_generation.ts` | medium | graph construction function |
| `expandGraphFromModel` | `packages/core/src/state_generation.ts` | medium | adapter from model to graph |

## Generated-target solver surface

| Current identifier | File | Rename risk | Note |
| --- | --- | --- | --- |
| `GeneratedTargetSolverGateResult` | `packages/core/src/generated_target_solver_adapter.ts` | high | gate result public type |
| `GeneratedTargetSolverGateFailureCode` | `packages/core/src/generated_target_solver_adapter.ts` | high | rejection code alias |
| `GeneratedTargetSolverGateResultSummary` | `packages/core/src/generated_target_solver_adapter.ts` | high | summary output shape |
| `GeneratedTargetComparisonReportRowStatus` | `packages/core/src/generated_target_solver_adapter.ts` | high | report row status |
| `GeneratedTargetComparisonReportRow` | `packages/core/src/generated_target_solver_adapter.ts` | high | report row shape |
| `GeneratedTargetComparisonReport` | `packages/core/src/generated_target_solver_adapter.ts` | high | report identity-adjacent |
| `summarizeGeneratedTargetSolverGateResult` | `packages/core/src/generated_target_solver_adapter.ts` | medium | summary formatter input boundary |
| `formatGeneratedTargetSolverGateResultSummary` | `packages/core/src/generated_target_solver_adapter.ts` | medium | plain text output |
| `buildGeneratedTargetComparisonReport` | `packages/core/src/generated_target_solver_adapter.ts` | high | report construction boundary |
| `formatGeneratedTargetComparisonReport` | `packages/core/src/generated_target_solver_adapter.ts` | high | report text output |
| `solveExpectedRewardWithGeneratedTargetGate` | `packages/core/src/generated_target_solver_adapter.ts` | high | solver behavior boundary |

## Generated-target policy surface

| Current identifier | File | Rename risk | Note |
| --- | --- | --- | --- |
| `GeneratedTargetSolverPolicyCandidate` | `packages/core/src/generated_target_solver_policy.ts` | high | policy name surface |
| `GeneratedTargetSolverPlanningDecision` | `packages/core/src/generated_target_solver_policy.ts` | high | planning decision surface |
| `requireGeneratedMatchPlanningDecision` | `packages/core/src/generated_target_solver_policy.ts` | high | default policy constant |
| `GeneratedTargetSolverPlanningRejection` | `packages/core/src/generated_target_solver_policy.ts` | high | rejection shape |
| `GeneratedTargetSolverPlanningValidationResult` | `packages/core/src/generated_target_solver_policy.ts` | high | validation result shape |
| `validateGeneratedTargetSolverPlanningBoundary` | `packages/core/src/generated_target_solver_policy.ts` | high | boundary validation function |

## Report model surface

| Current identifier | File | Rename risk | Note |
| --- | --- | --- | --- |
| `ReportRowStatus` | `packages/core/src/report_model.ts` | high | report model public surface |
| `ReportRow` | `packages/core/src/report_model.ts` | high | report row shape |
| `ReportSection` | `packages/core/src/report_model.ts` | high | report section shape |
| `ReportModel` | `packages/core/src/report_model.ts` | high | report identity surface |
| `formatReportModelPlainText` | `packages/core/src/report_model.ts` | medium | formatter boundary |
| `generatedTargetSolverGateResultSummaryToReportModel` | `packages/core/src/report_model.ts` | high | report adapter boundary |
| `generatedTargetComparisonReportToReportModel` | `packages/core/src/report_model.ts` | high | report identity boundary |

## Rename guidance

- `high` risk identifiers should not be renamed until public import, report identity, fixture, and test impact are reviewed together.
- `medium` risk identifiers may be candidates for later internal rename only after reference search.
- No identifier in this map is approved for immediate rename by this document.

## Next safe step

The next safe step is to add a reference-search checklist for each candidate group before changing code.
