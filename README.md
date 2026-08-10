# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機プロジェクトです。

DefinitionModel → ExpandedModel → EvaluatedModel → SolvedModel → OutputResult → ContributionResult を中核に、キヨタンforward評価と、観測からparameter candidateを順位付けする最小セイカタンreverse estimationを段階的に固定しています。

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

## Current position

キヨタン側は、第三者がchecked external inputから評価・比較・one-at-a-time sensitivityまで一続きに実行できる **forward v1 candidate** です。正式な対応範囲・partial boundary・unsupported機能・数学上の制約は [Forward v1 support matrix and handoff map](docs/forward-v1-support-matrix.md) を正とします。

ObservationDatasetはmodel definition、supplied parameter、evaluated value、forward result、estimateから分離された証拠データ面です。`state_count / transition_count / scalar` を扱います。

セイカタン側は有限candidate searchを中心に、transition-count likelihood、scalar Gaussian likelihood、それらを明示的な条件付き独立仮定の下で合成するsingle-parameter composite likelihood、さらにfinite multi-parameter transition gridを持ちます。

### Transition-count likelihood

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

1つのdeclared parameterについて有限candidate setを評価し、completeな`state_count / transition_count` departure観測に対して `sum k * log(p)` を計算します。

`relativeLikelihoodToBest` はbest candidateへのlikelihood ratioでありposterior probabilityではありません。

### Scalar Gaussian likelihood

```text
conditionally_independent_gaussian_scalar_log_likelihood
```

scalar observationをparameterへ直接コピーせず、各`observationId`を明示的なmodel-side predictorへ結びます。

現在のpredictorはunitを明示できるものに限定しています。

```text
expected_elapsed_time_seconds
reward_axis_expected_value(axisId)
```

観測値 `y`、candidateから計算した予測値 `mu`、callerが明示した `sigma > 0` に対してnormalized Gaussian log-likelihood densityを使います。

```text
log L = -log(sigma * sqrt(2*pi)) - 0.5 * ((y - mu) / sigma)^2
```

複数scalar観測は `scalar_observations_conditionally_independent_given_candidate` を明示してlog-likelihoodを加算します。observation unit、predictor unit、Gaussian error-model unitは完全一致が必要です。default sigma、epsilon smoothing、自動unit変換、prior、posteriorは導入しません。

### Composite transition + scalar likelihood

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

同じsingle-parameter candidateへtransition-count evidenceとscalar Gaussian evidenceを使う場合、callerは次のevidence-block仮定を明示しなければなりません。

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

transition用観測IDとscalar bindingを明示分離し、全ObservationDataset recordをちょうど1つのblockへ割り当てます。未使用観測を黙って捨てません。

既存2つのcomponent estimatorを再利用し、合成時だけ次を計算します。

```text
totalScore
= transitionLogLikelihoodScore
+ scalarGaussianLogLikelihoodScore
```

transition componentはcandidate-independentなmultinomial constantを省略しているため、totalはそのconstantまでのlog-likelihood scoreです。candidate rankingとbestへのlikelihood ratioではconstantが相殺されます。

transition componentがpositive observationに対してprobability 0を与えたcandidateは、scalar scoreが有限でもcompositeではimpossibleのままです。scalar predictorが非収束ならそのcandidateをlikelihood evidenceへ使いません。

### Finite multi-parameter grid

```text
finite_cartesian_parameter_grid
```

複数のdeclared unknown parameterへ有限candidate setを与え、constraint適用後のCartesian productを全列挙して既存transition-count likelihoodでassignmentを順位付けします。

`maxCombinations` は必須です。eligible gridが上限を超える場合は実行前に拒否し、暗黙のtruncate・sampling・random searchへ切り替えません。

複数assignmentがbest scoreでtieした場合は `tied_best_assignments` として返し、`estimatedAssignment` を勝手に1つ選びません。これはsupplied finite grid上のidentifiability情報であり、因果寄与分解ではありません。

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
→ E[reward] / E[elapsed time] reward rate
→ contribution
→ optional named reward axes
→ convergence diagnostics
→ structured forward result
```

追加のforward analysis:

```text
same model + baseline/candidate parameters
→ scenario comparison (candidate - baseline)
```

```text
same model + baseline + one selected parameter + candidate values
→ one-at-a-time sensitivity
```

scenario差やcontribution差をmethod未定義のまま一意な因果寄与とは扱いません。

## Minimal Seikatan paths

Single-parameter transition counts:

```text
one parameterized model
+ one unknown parameter ID
+ finite candidates
+ complete state_count / transition_count departures
→ transition log-likelihood ranking
```

Scalar Gaussian:

```text
one parameterized model
+ one unknown parameter ID
+ finite candidates
+ scalar observations
+ explicit predictor / sigma / unit
→ converged model-side prediction
→ Gaussian log-likelihood ranking
```

Composite evidence:

```text
one parameterized model
+ one unknown parameter ID
+ finite candidates
+ explicit transition observation IDs
+ explicit scalar likelihood bindings
+ explicit between-block conditional independence assumption
→ existing transition component score
+ existing scalar Gaussian component score
→ composite likelihood-score ranking
```

Multi-parameter transition grid:

```text
one parameterized model
+ two or more unknown parameter IDs
+ finite candidate set per parameter
+ explicit maxCombinations
+ transition-count evidence
→ exhaustive Cartesian assignment search
→ existing transition likelihood score
→ unique best / tied best / no possible assignment
```

現在のchecked external reverse JSON envelopeはsingle-parameter transition-count estimatorへ接続しています。scalar Gaussian、composite、multi-parameter gridは現時点ではtyped public APIです。

## Implemented public surface highlights

```text
DefinitionModel / ExpandedModel / EvaluatedModel / SolvedModel
RewardAxesDefinitionModel / RewardAxisDefinition
ParameterizedDefinitionModel / ParameterizedRewardAxesDefinitionModel
ObservationDataset / ObservationRecord
ForwardEvaluationResult
ScenarioComparisonResult
ParameterSensitivityResult
DiscreteParameterEstimationRequest / DiscreteParameterEstimationResult
ScalarGaussianParameterEstimationRequest / ScalarGaussianParameterEstimationResult
CompositeLikelihoodEstimationRequest / CompositeLikelihoodEstimationResult
MultiParameterGridEstimationRequest / MultiParameterGridEstimationResult
ExternalDiscreteEstimationDocument / ExternalDiscreteEstimationResult
```

Representative operations:

```text
prepareExternalModelInput / prepareExternalModelJson
evaluateExternalModelInput / evaluateExternalModelJson
compareExternalModelScenarios
analyzeParameterSensitivity
parseObservationDataset / validateObservationDataset
estimateDiscreteParameterCandidates
estimateExternalDiscreteParameterInput / estimateExternalDiscreteParameterJson
estimateScalarGaussianParameterCandidates
estimateCompositeParameterCandidates
estimateMultiParameterGrid
```

## Current boundaries

```text
solver target is explicit-only through transition.to
generatedTo is diagnostics-only
named reward axes are never implicitly netted or unit-converted
ObservationDataset is not converted into supplied parameters
non-convergence remains explicit
scenario comparison uses candidate - baseline
one-at-a-time sensitivity changes one selected parameter per point
contribution differences are descriptive, not unique causal attribution
TeX/report remain partial rather than full forward/reverse renderers
transition-count and scalar Gaussian likelihood remain separately named methods
composite likelihood requires explicit evidence partition and conditional-independence declaration
composite total score is up to the omitted candidate-independent transition multinomial constant
relative likelihood is not posterior probability
scalar Gaussian sigma is explicit and strictly positive
scalar Gaussian observation/predictor/error-model units must match exactly
multi-parameter transition estimation is finite exhaustive grid search only
multi-parameter grid requires an explicit hard combination limit
tied best assignments are finite-grid non-identifiability only
continuous optimization remains unsupported
Bayesian prior/posterior remains unsupported
hidden-state inference remains unsupported
multi-parameter causal attribution remains unsupported without a defined method
product UI / monetization is outside the current core phase
digipachi and Juoh remain later representative applications
```

## Primary docs

- [Forward v1 support matrix and handoff map](docs/forward-v1-support-matrix.md)
- [External model input boundary](docs/external-input.md)
- [Observation input surface](docs/observations.md)
- [Forward evaluation facade](docs/forward-evaluation.md)
- [Scenario comparison](docs/scenario-comparison.md)
- [One-at-a-time parameter sensitivity](docs/parameter-sensitivity.md)
- [Minimal discrete reverse estimation](docs/discrete-estimation.md)
- [Checked external reverse-estimation input](docs/reverse-external-input.md)
- [Scalar Gaussian reverse estimation](docs/scalar-gaussian-estimation.md)
- [Composite likelihood estimation](docs/composite-likelihood-estimation.md)
- [Finite multi-parameter grid estimation](docs/multi-parameter-grid-estimation.md)
- [成果還元関数 continuation review](docs/outcome-continuation-review.md)
- [Named reward axes](docs/reward-axes.md)
- [Structured validation](docs/structured-validation.md)
- [Solver convergence diagnostics](docs/solver-diagnostics.md)
- [Parameter references and formula scalars](docs/parameterized-scalars.md)

## Representative examples

```text
packages/core/examples/forward_evaluation.ts
packages/core/examples/scenario_comparison.ts
packages/core/examples/discrete_estimation.ts
packages/core/examples/scalar_gaussian_estimation.ts
packages/core/examples/composite_likelihood_estimation.ts
packages/core/examples/multi_parameter_grid_estimation.ts
```

特定ゲーム固有の値やルールはgeneric coreへ持ち込みません。

## Next priority

composite likelihoodでanalytical compositionはsingle-parameterまで成立しました。次の実務上の大きな差は、typed-onlyのscalar Gaussian / composite / multi-parameter gridへchecked external JSON / unknown input境界を追加することです。

その後、multi-parameter composite gridへ進む価値があるかをgeneric exampleで再評価します。Bayesian prior/posteriorは、意味のあるprior mass/densityを供給する具体的use caseが出るまで低優先度を維持します。

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします。
