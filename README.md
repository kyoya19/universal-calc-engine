# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機プロジェクトです。

このリポジトリでは、DefinitionModel → ExpandedModel → EvaluatedModel → SolvedModel → OutputResult → ContributionResult の流れを中核に、期待値・到達確率・時間評価・単位時間成果・複数成果軸・構造化検証・solver収束診断・parameter/formula解決・外部JSON入力境界・観測入力境界・寄与分解・統合forward評価・scenario比較・one-at-a-time sensitivity・最小reverse estimation・JSON / TeX / report 境界を段階的に固定します。

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

最小キヨタン順方向エンジンは、第三者が一続きに入力・評価・比較・感度確認・説明できるforward v1候補として境界を固定しています。その正式な対応範囲・partial boundary・unsupported機能・数学上の制約は [Forward v1 support matrix and handoff map](docs/forward-v1-support-matrix.md) を正とします。

外部model documentは `schemaVersion: 1` を持ち、unknown / JSONからshape-checkし、parameter/formula resolution、structured model validationを経て既存DefinitionModelへ接続します。外部入力失敗は `json_syntax / shape / parameter_resolution / model_validation` を分離します。

観測値は `ObservationDataset` としてmodel definition、supplied parameter、evaluated resultとは別データ面に分離しています。`state_count / transition_count / scalar` を扱います。

統合forward facadeは、checked inputから expected reward、expected elapsed time、`ratio_of_expectations` reward rate、optional reachability、既存contribution、named reward axes、solver convergence diagnosticsまでを一つのadditive APIで返します。solverが設定回数内に収束しない場合は入力失敗と混同せず、`ok: true / converged: false` と最後の近似値・diagnosticsを返します。

scenario comparisonは、**同一model structure**へbaseline/candidateの2つのparameter setを与え、resolved parameter差、expected reward/time/rate/reachability差、legacy contribution行の差、named reward-axis差を構造化して返します。差の符号は `candidate - baseline` です。

one-at-a-time sensitivityはbaseline parameter setを固定し、指定した1 parameterだけをcandidate valueへ差し替えたscenario comparisonを複数実行します。これにより「他のsupplied parameterを固定したとき、このparameterの変更で結果がどう変わるか」という明示的なcounterfactualを扱えます。

最小セイカタンreverse estimationは、1つのdeclared parameterについて有限candidate setを与え、`state_count / transition_count` 観測に対するconditional transition log-likelihood scoreでcandidateを順位付けします。priorは使わずposteriorも計算しません。`relativeLikelihoodToBest` はbest candidateに対するlikelihood ratioでありposterior probabilityではありません。

reverse estimationにもversionedなchecked external input境界を追加しています。`unknown` / JSONからreverse envelope、nested model document、ObservationDataset、candidate requestをshape-checkしてから既存estimatorへ接続します。JSON構文・shape・estimation semanticsは別stageで返し、duplicate candidateや観測count不整合をparserが勝手に補正しません。

contribution差は `difference_of_existing_contributions` と明示し、scenario comparisonやsensitivityの結果を自動的な一意の因果分解とは扱いません。TeX/reportも現時点では部分的境界であり、forward facade全体の正式レンダラーではありません。

次の優先判断は、明示的な観測モデルを持つscalar observation likelihood、有限multi-parameter candidate grid、またはpriorを別契約として導入する価値があるかを比較することです。大型のデジパチ・獣王モデルや巨大Bayesian engineを先に進めません。

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
ScenarioComparisonResult / ScenarioComparisonParameterSets
ScenarioForwardDelta / ScenarioContributionDelta
ScenarioRewardAxesDelta / ScenarioRewardAxesContributionDelta
ParameterSensitivityResult / ParameterSensitivityRequest
ParameterSensitivityKind
DiscreteParameterEstimationRequest / DiscreteParameterEstimationResult
CandidateLikelihoodResult / EstimationConstraint
ExternalDiscreteEstimationDocument / ExternalDiscreteEstimationResult
ReverseExternalInputIssue / ReverseExternalInputStage
ProbabilitySpec
RewardSpec
TimeSpec / TimeUnit
RewardAxisDefinition / RewardAxisKind
TerminalCondition
TransitionEffect
```

Representative public operations include:

```text
expandModel / evaluateModel
solveExpectedReward
solveReachabilityProbability
solveExpectedElapsedTime
toRewardRateResult
solveExpectedRewardAxes
validateDefinitionModel / validateRewardAxesDefinitionModel
solveExpectedRewardWithDiagnostics
solveReachabilityProbabilityWithDiagnostics
solveExpectedElapsedTimeWithDiagnostics
solveExpectedRewardAxesWithDiagnostics
resolveParameterizedScalarSpec
resolveParameterValues
resolveParameterizedDefinitionModel
resolveParameterizedRewardAxesDefinitionModel
parseExternalModelDocument / prepareExternalModelJson
parseObservationDataset / validateObservationDataset
evaluateExternalModelInput / evaluateExternalModelJson
compareExternalModelScenarios
analyzeParameterSensitivity
estimateDiscreteParameterCandidates
parseExternalDiscreteEstimationDocument / parseExternalDiscreteEstimationJson
estimateExternalDiscreteParameterInput / estimateExternalDiscreteParameterJson
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

## Scenario comparison path

```text
one checked external model
+ baseline parameter set
+ candidate parameter set
→ two forward facade results
→ resolved parameter deltas
→ expected reward/time/rate/reachability deltas
→ contribution-row deltas
→ optional reward-axis deltas
```

## One-at-a-time sensitivity path

```text
one checked external model
+ baseline parameter set
+ selected parameter
+ candidate values
→ one scenario comparison per candidate
→ exactly one supplied parameter changed per point
→ structured counterfactual deltas
```

## Minimal Seikatan path

Typed path:

```text
one parameterized external model
+ one unknown parameter ID
+ finite candidate values
+ optional min/max candidate constraints
+ ObservationDataset with complete state_count / transition_count departures
→ resolve and validate each candidate model
→ conditional transition log-likelihood score
→ likelihood ratio relative to the best candidate
→ candidate ranking
→ unique estimate or explicit tie
```

Third-party checked path:

```text
external JSON / unknown
→ versioned reverse envelope
→ nested model + observation shape checks
→ typed discrete request
→ existing estimator
→ structured result
```

このreverse pathでは観測値をparameterへ直接コピーしません。prior/posteriorも未導入です。scalar observationは現在のtransition-count likelihood methodでは明示的にunsupportedです。

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
scenario comparison reuses one model structure and compares candidate - baseline
one-at-a-time sensitivity changes one selected supplied parameter per comparison point
contribution-row deltas are descriptive differences, not automatic unique causal attribution
TeX/report are partial boundaries rather than complete forward-v1 renderers
minimal reverse estimation ranks a finite candidate set for one declared parameter
minimal reverse likelihood uses complete transition departure counts and no prior
reverse external input is checked from unknown/JSON before estimator semantics run
relative likelihood is not posterior probability
scalar observation likelihood, continuous optimization, multi-parameter estimation, and Bayesian posterior remain unsupported
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
- [Scenario comparison](docs/scenario-comparison.md)
- [One-at-a-time parameter sensitivity](docs/parameter-sensitivity.md)
- [Forward v1 support matrix and handoff map](docs/forward-v1-support-matrix.md)
- [Minimal discrete reverse estimation](docs/discrete-estimation.md)
- [Checked external reverse-estimation input](docs/reverse-external-input.md)

## Representative examples

```text
packages/core/examples/forward_evaluation.ts
packages/core/examples/scenario_comparison.ts
packages/core/examples/discrete_estimation.ts
```

forward examplesは同じmodel structureに対してparameter値を差し替え、複数forward結果とscenario差分を評価します。reverse exampleは観測countから有限candidateをlikelihood順位付けします。特定ゲーム固有の値やルールはcoreへ持ち込みません。

## Historical / legacy docs notes

README previously contained many one-line docs note checkpoints. They are no longer used as the main entry path.

Those note files remain in `docs/` as historical records unless a later repair PR confirms that a specific file is empty, duplicated, or incorrect. Active behavior should be read from the primary docs and production implementation.

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします。
