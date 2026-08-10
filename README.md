# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機プロジェクトです。

このリポジトリでは、DefinitionModel → ExpandedModel → EvaluatedModel → SolvedModel → OutputResult → ContributionResult のforward系を中核に、外部入力・観測・scenario比較・感度分析・最小reverse estimationを段階的に固定します。

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

最小キヨタンforward engineは、第三者が一続きに入力・評価・比較・感度確認・説明できる **forward v1候補** まで統合しています。

外部model documentは `schemaVersion: 1` を持ち、unknown / JSONからshape-checkし、parameter/formula resolution、structured model validationを経て既存DefinitionModelへ接続します。

統合forward facadeは checked input から expected reward、expected elapsed time、`ratio_of_expectations` reward rate、optional reachability、contribution、named reward axes、solver convergence diagnosticsまでを返します。

scenario comparisonは同一model structureへbaseline/candidate parameter setを与え、差を `candidate - baseline` として構造化します。one-at-a-time sensitivityは他のsupplied baseline parametersを固定し、指定parameterだけを変更するcounterfactualです。

観測値は `ObservationDataset` としてmodel definition、supplied parameter、evaluated resultから分離されています。

### Minimal Seikatan reverse estimation

最初のSeikatan-style production boundaryとして、単一unknown parameterを有限candidate集合から選ぶ離散maximum-likelihood推定を追加しています。

```text
parameterized model
+ fixed parameter values
+ one unknown parameter
+ finite candidate values
+ ObservationDataset transition counts
+ optional numeric range constraint
→ candidate-resolved transition probabilities
→ complete-category multinomial log-likelihood
→ maximum likelihood over supplied candidates
```

現在のreverse likelihoodは `transition_count` だけを使用します。`state_count` と generic `scalar` observation はvalidation対象ですが、観測モデルが未定義なのでlikelihoodへ暗黙投入しません。

prior / posterior / Bayesian updateは未実装です。`relativeLikelihoodToBest` は最良candidateに対するlikelihood ratioであり、posterior probabilityではありません。

forward v1とminimal reverseの正式な対応範囲・partial boundary・unsupported機能・数学上の制約は [Forward v1 support matrix and handoff map](docs/forward-v1-support-matrix.md) を参照してください。

次のreverse候補は、versioned external reverse-request boundary、state_countを使う場合の明示的exposure observation model、または追加likelihood modelです。multi-parameter inferenceやBayesian prior/posteriorは数学・型契約を先に定義してから扱います。大型のデジパチ・獣王モデルを先に進めません。

`generatedTo` は diagnostics-only です。solver target は `transition.to` の explicit-only を維持します。

## Implemented core

```text
DefinitionModel / ExpandedModel / EvaluatedModel / SolvedModel
OutputResult / ContributionResult
ReachabilityResult / ExpectedElapsedTimeResult / RewardRateResult
RewardAxesDefinitionModel / RewardAxesEvaluatedModel / RewardAxesOutputResult
ModelValidationResult / ModelValidationIssue
SolverConvergenceDiagnostics / SolverDetailedResult
ParameterizedDefinitionModel / ParameterizedRewardAxesDefinitionModel
ParameterizedScalarSpec / ParameterDefinition / ParameterRefScalarSpec / ScalarFormulaSpec
ExternalModelDocument / ExternalModelPreparationResult
ObservationDataset / ObservationRecord / ObservationValidationResult
ForwardEvaluationResult / ForwardEvaluationOptions
ScenarioComparisonResult / ScenarioForwardDelta / ScenarioContributionDelta
ParameterSensitivityResult / ParameterSensitivityRequest
DiscreteParameterEstimationRequest / DiscreteParameterEstimationResult
DiscreteParameterEstimate / ParameterCandidateResult
TransitionLikelihoodTerm / ReverseLikelihoodKind
ProbabilitySpec / RewardSpec / TimeSpec / TimeUnit
RewardAxisDefinition / RewardAxisKind
TerminalCondition / TransitionEffect
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
resolveParameterValues
resolveParameterizedDefinitionModel
resolveParameterizedRewardAxesDefinitionModel
parseExternalModelDocument / prepareExternalModelJson
parseObservationDataset / validateObservationDataset
evaluateExternalModelInput / evaluateExternalModelJson
compareExternalModelScenarios
analyzeParameterSensitivity
estimateDiscreteParameterFromTransitions
```

## Forward v1 path

```text
external JSON / unknown
→ checked external document
→ parameter / formula resolution
→ structured model validation
→ expand / evaluate
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

## Minimal reverse path

```text
one checked external model
+ fixed supplied parameters
+ one declared unknown parameter
+ finite candidate set
+ complete transition_count categories
→ resolve/validate each candidate model
→ transition multinomial log-likelihood
→ relative likelihood to best candidate
→ maximum-likelihood estimate over the supplied candidate set
```

観測値をparameterへ直接コピーして推定とは呼びません。

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
named reward axes are never implicitly aggregated across meanings or units
legacy reward remains separate from rewardsByAxis
structured validation is additive; existing expand/evaluate exception behavior is unchanged
solver diagnostics are additive; legacy solver result and exception contracts are unchanged
parameter/formula scalars resolve before the existing DefinitionModel pipeline
parameter unit metadata is descriptive; automatic dimensional analysis is not implemented
external JSON input is shape-checked from unknown before parameter resolution or model validation
external input formulas use explicit expression trees; executable formula text is not accepted
observations remain separate from model parameters and solver results
forward facade composes existing layers; it does not replace lower-level APIs
scenario comparison is descriptive for multi-parameter changes
one-at-a-time sensitivity changes one selected supplied parameter per point
minimal reverse estimation uses one unknown parameter and finite candidate values
reverse likelihood currently consumes complete transition_count categories only
state_count/scalar likelihoods are not implemented
Bayesian prior/posterior and multi-parameter reverse estimation are not implemented
TeX/report are partial boundaries rather than complete v1 renderers
product UI / monetization is out of scope for this repository phase
digipachi and Juoh are later representative samples, not the current main phase
```

## Primary docs

- [Assistant autonomy](docs/assistant_autonomy.md)
- [GitHub workflow](docs/github_workflow.md)
- [成果還元関数](docs/outcome-return-function.md)
- [成果還元関数 roadmap](docs/outcome-roadmap.md)
- [成果還元関数 continuation review](docs/outcome-continuation-review.md)
- [Forward v1 support matrix and handoff map](docs/forward-v1-support-matrix.md)
- [Named reward axes](docs/reward-axes.md)
- [Structured validation](docs/structured-validation.md)
- [Solver convergence diagnostics](docs/solver-diagnostics.md)
- [Parameter references and formula scalars](docs/parameterized-scalars.md)
- [External model input boundary](docs/external-input.md)
- [Observation input surface](docs/observations.md)
- [Forward evaluation facade](docs/forward-evaluation.md)
- [Scenario comparison](docs/scenario-comparison.md)
- [One-at-a-time parameter sensitivity](docs/parameter-sensitivity.md)
- [Discrete reverse estimation](docs/discrete-reverse-estimation.md)

## Representative examples

```text
packages/core/examples/forward_evaluation.ts
packages/core/examples/scenario_comparison.ts
packages/core/examples/discrete_reverse_estimation.ts
```

examplesは特定ゲーム固有ルールをcoreへ持ち込まず、generic modelとしてforward/reverse境界を確認するためのものです。

## Historical / legacy docs notes

Historical boundary notes remain in `docs/` where they still preserve review history. Active behavior should be read from the primary docs above and the production implementation rather than inferred from old checkpoint notes.

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします。
