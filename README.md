# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機プロジェクトです。

このリポジトリでは、DefinitionModel → ExpandedModel → EvaluatedModel → SolvedModel → OutputResult → ContributionResult の流れを中核に、期待値・到達確率・時間評価・単位時間成果・複数成果軸・構造化検証・solver収束診断・parameter/formula解決・外部JSON入力境界・寄与分解・JSON / TeX / report 境界を段階的に固定します。

## License / Commercial Use

Copyright (c) 2026 Kyoya Sato. All rights reserved.

This repository is source-available for review, study, and non-commercial evaluation only.

Commercial use is not permitted without a prior written paid license from the copyright holder.

Commercial use includes, but is not limited to, use in paid products or services, SaaS, web services, applications, commercial tools, consulting, paid analysis reports, business deliverables, client work, redistribution, sublicensing, modification for commercial purposes, or incorporation into proprietary systems, commercial decision-support systems, or internal business systems.

Making this repository public does not grant a commercial license.

For details, see [Commercial License Notice](COMMERCIAL-LICENSE.md).

## ライセンス / 商用利用

本リポジトリは、閲覧・研究・非商用評価のために公開する source-available project です。

権利者による事前の書面許諾および有料ライセンスなしに、商用利用することを禁止します。

本リポジトリの公開は、商用ライセンスの付与を意味しません。

商用利用を希望する場合は、利用前にリポジトリ所有者へ連絡してください。

## Current focus

現在の焦点は、すごろくPoCで固定した汎用状態遷移基盤を、最小キヨタン順方向エンジンとして第三者が入力・評価できる形へ広げることです。

期待報酬、到達確率、単位付き経過時間、終端までの期待経過時間、`ratio_of_expectations` を明示した単位時間成果、名前付き複数成果軸、structured validation、solver convergence diagnostics、parameter/formula解決に加え、`schemaVersion: 1` の外部model documentを unknown / JSON からshape-checkし、parameter resolution、structured model validationを経て既存DefinitionModelへ接続する入力境界を追加しています。

外部入力失敗は `json_syntax / shape / parameter_resolution / model_validation` を分離します。JSONをparseできたことだけを型安全とは扱いません。

次段階では observation input surface preparation、非ドメイン固有のend-to-end利用例、必要性が確認できるricher transition effectsを優先します。

デジパチ・獣王・セイカタン本体を先に拡張せず、まず汎用モデル層と第三者利用境界を完成形へ近づけます。

`generatedTo` は diagnostics-only です。solver target は `transition.to` の explicit-only を維持します。`generatedTo` を solver target に使う変更は、専用 solver policy PR まで行いません。

## Implemented core

```text
DefinitionModel
ExpandedModel
EvaluatedModel
SolvedModel
OutputResult
ContributionResult
ReachabilityResult
ExpectedElapsedTimeResult
RewardRateResult
RewardAxesDefinitionModel
RewardAxesExpandedModel
RewardAxesEvaluatedModel
RewardAxesSolvedModel
RewardAxesOutputResult
RewardAxesContributionResult
ModelValidationResult / ModelValidationIssue
SolverConvergenceDiagnostics / SolverDetailedResult
ParameterizedDefinitionModel
ParameterizedRewardAxesDefinitionModel
ParameterizedScalarSpec
ParameterDefinition / ParameterRefScalarSpec / ScalarFormulaSpec
ExternalModelDocument / ExternalModelPreparationResult
ExternalInputIssue / ExternalInputStage
ProbabilitySpec
RewardSpec
TimeSpec / TimeUnit
RewardAxisDefinition / RewardAxisKind
TerminalCondition
TransitionEffect
expandModel
evaluateModel
solveExpectedReward
solveReachabilityProbability
solveExpectedElapsedTime
evaluateTimeSpecSeconds
toRewardRateResult
expandRewardAxesModel
evaluateRewardAxesModel
solveExpectedRewardAxes
toRewardAxesOutputResult
toRewardAxesContributionResult
validateDefinitionModel
validateRewardAxesDefinitionModel
modelValidationResultToJson
solveExpectedRewardWithDiagnostics
solveReachabilityProbabilityWithDiagnostics
solveExpectedElapsedTimeWithDiagnostics
solveExpectedRewardAxesWithDiagnostics
solverConvergenceDiagnosticsToJson
resolveParameterizedScalarSpec
resolveParameterValues
resolveParameterizedDefinitionModel
resolveParameterizedRewardAxesDefinitionModel
parseExternalModelDocument
parseExternalModelDocumentJson
prepareExternalModelDocument
prepareExternalModelInput
prepareExternalModelJson
externalModelPreparationResultToJson
toOutputResult
toContributionResult
JSON helper
state generation
graph diagnostics
generated target planning boundary
explicit-only solver target policy
TeX / report / boundary digest boundary pieces
```

## Phase order

```text
1. Assistant autonomy rules
2. README and docs entry cleanup
3. Sugoroku PoC v0.4 completion and boundary check
4. Generic model layer reinforcement
5. Solver target policy formalization
6. Output, report, TeX, and JSON boundary cleanup
7. Minimal Kiyotan forward engine
8. Minimal Seikatan reverse estimation
9. Representative samples such as digipachi and Juoh
```

## Current boundaries

```text
solver target is explicit-only through transition.to
generatedTo is diagnostics-only
runtime target policy changes are out of scope until a dedicated policy PR
named reward axes are never implicitly aggregated across meanings or units
legacy reward remains separate from rewardsByAxis
structured validation is additive; existing expand/evaluate exception behavior is unchanged
solver diagnostics are additive; legacy solver result and exception contracts are unchanged
parameter/formula scalars resolve before the existing DefinitionModel pipeline
parameter unit metadata is descriptive; automatic dimensional analysis is not implemented
external JSON input is shape-checked from unknown before parameter resolution or model validation
external input formulas use explicit expression trees; executable formula text is not accepted
reverse estimation / Seikatan behavior is out of scope for the current phase
product UI / monetization is out of scope for this repository phase
digipachi and Juoh are later representative samples, not the current main phase
```

## Primary docs

- [Assistant autonomy](docs/assistant_autonomy.md)
- [GitHub workflow](docs/github_workflow.md)
- [Sugoroku PoC v0.3](docs/sugoroku-poc-v0.3.md)
- [Sugoroku PoC v0.4 Boundary](docs/sugoroku-poc-v0.4-boundary.md)
- [State Space Expansion Design](docs/state-space-expansion.md)
- [Solver explicit policy](docs/solver-exp.md)
- [Number text entrypoint](docs/number-text-entrypoint.md)
- [Naming policy](docs/naming-policy.md)
- [Public output naming boundary](docs/public-output-naming-boundary.md)
- [Evaluate model effects boundary](docs/evaluate-model-effects-boundary.md)
- [成果還元関数](docs/outcome-return-function.md)
- [成果還元関数 roadmap](docs/outcome-roadmap.md)
- [成果還元関数 current identifier map](docs/outcome-current-identifier-map.md)
- [成果還元関数 continuation review](docs/outcome-continuation-review.md)
- [成果還元関数 sample policy](docs/outcome-sample-policy.md)
- [Named reward axes](docs/reward-axes.md)
- [Structured validation](docs/structured-validation.md)
- [Solver convergence diagnostics](docs/solver-diagnostics.md)
- [Parameter references and formula scalars](docs/parameterized-scalars.md)
- [External model input boundary](docs/external-input.md)

## Historical / legacy docs notes

README previously contained many one-line docs note checkpoints. They are no longer used as the main entry path.

Those note files remain in `docs/` as historical records unless a later repair PR confirms that a specific file is empty, duplicated, or incorrect. This README now points to the active docs entry set instead of repeating every checkpoint line.

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします。