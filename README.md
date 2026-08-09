# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機プロジェクトです。

このリポジトリでは、DefinitionModel → ExpandedModel → EvaluatedModel → SolvedModel → OutputResult → ContributionResult の流れを中核に、期待値・到達確率・時間評価・単位時間成果・複数成果軸・構造化検証・solver収束診断・parameter/formula解決・外部JSON入力境界・観測入力境界・寄与分解・統合forward評価・JSON / TeX / report 境界を段階的に固定します。

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

現在の焦点は、最小キヨタン順方向エンジンを「個別APIの集合」から「第三者が一続きに入力・評価・説明できるforward v1境界」へまとめることです。

外部model documentは `schemaVersion: 1` を持ち、unknown / JSONからshape-checkし、parameter/formula resolution、structured model validationを経て既存DefinitionModelへ接続します。外部入力失敗は `json_syntax / shape / parameter_resolution / model_validation` を分離します。

観測値は `ObservationDataset` としてmodel definition、supplied parameter、evaluated resultとは別データ面に分離しています。`state_count / transition_count / scalar` を扱いますが、観測値からparameterを推定する処理はまだ行いません。

統合forward facadeは、checked inputから expected reward、expected elapsed time、`ratio_of_expectations` reward rate、optional reachability、既存contribution、named reward axes、solver convergence diagnosticsまでを一つのadditive APIで返します。solverが設定回数内に収束しない場合は入力失敗と混同せず、`ok: true / converged: false` と最後の近似値・diagnosticsを返します。

非ドメイン固有のexampleでは、同一モデルのparameterだけを変更し、expected reward・reachability・expected time・reward rate・contributionが連動して変わることを示します。

次の優先判断は、forward v1の残差を再評価したうえで、scenario comparison / sensitivity / counterfactual explanationを先に強化するか、ObservationDataset上に最小reverse-estimation contractを置くかです。大型のデジパチ・獣王モデルを先に進めません。

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
ObservationDataset / ObservationRecord
ObservationParseResult / ObservationValidationResult
ForwardEvaluationResult / ForwardEvaluationOptions
ForwardElapsedTimeOutput / ForwardReachabilityOutput
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
parseObservationDataset
parseObservationDatasetJson
validateObservationDataset
observationDatasetToJson
evaluatePreparedExternalModel
evaluateExternalModelInput
evaluateExternalModelJson
forwardEvaluationResultToJson
toOutputResult
toContributionResult
JSON helper
state generation
graph diagnostics
generated target planning boundary
explicit-only solver target policy
TeX / report / boundary digest boundary pieces
```

## Forward v1 path

```text
external JSON / unknown
→ checked external document
→ parameter / formula resolution
→ structured model validation
→ expand
→ evaluate
→ expected reward
→ expected elapsed time
→ optional reachability
→ ratio-of-expectations reward rate
→ contribution
→ optional named reward axes + axis contribution
→ convergence diagnostics
→ structured facade result
```

観測データはこの順方向pathへparameterとして注入しません。後の逆方向推定層から別入力として参照する前提です。

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
observations remain separate from model parameters and solver results
forward facade composes existing layers; it does not replace the lower-level APIs
non-convergence remains visible through diagnostics and is not silently treated as a final converged result
full reverse estimation / Seikatan behavior is not implemented yet
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
- [Observation input surface](docs/observations.md)
- [Forward evaluation facade](docs/forward-evaluation.md)

## Representative example

```text
packages/core/examples/forward_evaluation.ts
```

同じmodel structureに対してparameter値を差し替え、複数forward結果を一括評価する例です。特定ゲーム固有の値やルールはcoreへ持ち込みません。

## Historical / legacy docs notes

README previously contained many one-line docs note checkpoints. They are no longer used as the main entry path.

Those note files remain in `docs/` as historical records unless a later repair PR confirms that a specific file is empty, duplicated, or incorrect. This README now points to the active docs entry set instead of repeating every checkpoint line.

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします。
