# 成果還元関数 reference-search checklist

この文書は、成果還元関数のcode-level renameへ進む前に、現行識別子ごとの参照確認手順を固定します。

この段階ではコードを書き換えません。

## Purpose

- rename前に参照範囲を確認する
- public import と internal helper を分離する
- report identity と runtime behavior を同一PRで変更しない
- production numeric values を触らない

## Search groups

| Group | Search target | Required confirmation |
| --- | --- | --- |
| Core model types | `DefinitionModel`, `ExpandedModel`, `EvaluatedModel`, `SolvedModel` | public exports and tests are identified |
| Result types | `OutputResult`, `ContributionResult` | serialized output impact is identified |
| Solver functions | `solveExpectedReward`, `toOutputResult`, `toContributionResult` | behavior-facing call sites are identified |
| Graph types | `ExpandedStateGraph`, `ExpandedStateEdge`, `StateGraphSummary` | diagnostic and summary output impact is identified |
| Graph helpers | `expandGraphFromModel`, `expandStateSpace`, `selectGraphTarget` | graph boundary impact is identified |
| Generated-target gate | `GeneratedTargetSolverGateResult`, `solveExpectedRewardWithGeneratedTargetGate` | gate behavior impact is identified |
| Generated-target reports | `GeneratedTargetComparisonReport`, `buildGeneratedTargetComparisonReport` | report identity impact is identified |
| Report model | `ReportModel`, `ReportRow`, `ReportSection` | report model surface impact is identified |

## Required checks before any rename PR

1. Search source files.
2. Search tests.
3. Search docs.
4. Search fixtures and snapshots.
5. Identify whether the symbol is publicly exported from `packages/core/src/index.ts`.
6. Identify whether the symbol appears in report `kind`, `title`, row ids, labels, or plain text.
7. Identify whether the symbol affects serialized output.
8. Confirm no production numeric value is changed.
9. Confirm no runtime target substitution is introduced.
10. Confirm CI is expected to cover the change.

## Stop conditions

Do not proceed with a rename PR if the candidate touches any of the following without a separate boundary document:

- report identity
- serialized output identity
- public import path
- expected value assertion
- executable production graph
- source-backed numeric value
- UI / TeX / CSS / Android native output

## Next safe step

The next safe step is a docs-only search result note that records actual references found for one group at a time.
