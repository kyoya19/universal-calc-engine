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

セイカタン側は、まだ有限candidate searchに限定していますが、現在2つの明示的likelihood familyがあります。

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

現在のpredictorは、unitを明示できるものに限定しています。

```text
expected_elapsed_time_seconds
reward_axis_expected_value(axisId)
```

観測値 `y`、candidateから計算した予測値 `mu`、callerが明示した `sigma > 0` に対して、normalized Gaussian log-likelihood densityを使います。

```text
log L = -log(sigma * sqrt(2*pi)) - 0.5 * ((y - mu) / sigma)^2
```

複数scalar観測は、以下を明示した場合にlog-likelihoodを加算します。

```text
scalar_observations_conditionally_independent_given_candidate
```

observation unit、predictor unit、Gaussian error-model unitは完全一致が必要です。default sigma、epsilon smoothing、自動unit変換、prior、posteriorは導入しません。solver非収束の予測値もlikelihoodへ入れません。

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

Transition counts:

```text
one parameterized model
+ one unknown parameter ID
+ finite candidates
+ optional min/max constraints
+ complete state_count / transition_count departures
→ candidate resolution / validation
→ conditional transition log-likelihood
→ likelihood-ratio ranking
→ unique estimate or explicit tie
```

Scalar Gaussian:

```text
one parameterized model
+ one unknown parameter ID
+ finite candidates
+ scalar ObservationDataset
+ explicit observationId -> predictor bindings
+ explicit Gaussian sigma and unit
→ candidate resolution / validation
→ converged model-side prediction
→ Gaussian log-likelihood density
→ likelihood-ratio ranking
→ unique estimate or explicit tie
```

現在のchecked external reverse JSON envelopeはtransition-count estimatorへ接続しています。scalar Gaussian estimatorは現時点ではtyped public APIであり、専用external envelopeはまだ未追加です。

## Implemented public surface highlights

```text
DefinitionModel / ExpandedModel / EvaluatedModel / SolvedModel
RewardAxesDefinitionModel / RewardAxisDefinition
ParameterizedDefinitionModel / ParameterizedRewardAxesDefinitionModel
ParameterizedScalarSpec / ParameterDefinition
ObservationDataset / ObservationRecord
ModelValidationResult / SolverConvergenceDiagnostics
ForwardEvaluationResult
ScenarioComparisonResult
ParameterSensitivityResult
DiscreteParameterEstimationRequest / DiscreteParameterEstimationResult
ScalarGaussianParameterEstimationRequest / ScalarGaussianParameterEstimationResult
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
```

## Current boundaries

```text
solver target is explicit-only through transition.to
generatedTo is diagnostics-only
named reward axes are never implicitly netted or unit-converted
legacy reward remains separate from rewardsByAxis
structured validation and solver diagnostics are additive
parameter/formula resolution happens before the ordinary model pipeline
executable formula text is not accepted
ObservationDataset is not converted into supplied parameters
non-convergence remains explicit
scenario comparison uses candidate - baseline
one-at-a-time sensitivity changes one selected parameter per point
contribution differences are descriptive, not unique causal attribution
TeX/report remain partial rather than full forward/reverse renderers
transition-count likelihood and scalar Gaussian likelihood are separately named methods
relative likelihood is not posterior probability
scalar Gaussian sigma is explicit and strictly positive
scalar Gaussian observation/predictor/error-model units must match exactly
continuous optimization remains unsupported
multi-parameter estimation remains unsupported
Bayesian prior/posterior remains unsupported
hidden-state inference remains unsupported
product UI / monetization is outside the current core phase
digipachi and Juoh remain later representative applications
```

## Primary docs

- [Assistant autonomy](docs/assistant_autonomy.md)
- [GitHub workflow](docs/github_workflow.md)
- [Forward v1 support matrix and handoff map](docs/forward-v1-support-matrix.md)
- [External model input boundary](docs/external-input.md)
- [Observation input surface](docs/observations.md)
- [Forward evaluation facade](docs/forward-evaluation.md)
- [Scenario comparison](docs/scenario-comparison.md)
- [One-at-a-time parameter sensitivity](docs/parameter-sensitivity.md)
- [Minimal discrete reverse estimation](docs/discrete-estimation.md)
- [Checked external reverse-estimation input](docs/reverse-external-input.md)
- [Scalar Gaussian reverse estimation](docs/scalar-gaussian-estimation.md)
- [成果還元関数 continuation review](docs/outcome-continuation-review.md)
- [Named reward axes](docs/reward-axes.md)
- [Structured validation](docs/structured-validation.md)
- [Solver convergence diagnostics](docs/solver-diagnostics.md)
- [Parameter references and formula scalars](docs/parameterized-scalars.md)

Historical design/boundary documents remain in `docs/`; the list above is the active handoff path.

## Representative examples

```text
packages/core/examples/forward_evaluation.ts
packages/core/examples/scenario_comparison.ts
packages/core/examples/discrete_estimation.ts
packages/core/examples/scalar_gaussian_estimation.ts
```

特定ゲーム固有の値やルールはgeneric coreへ持ち込みません。

## Next priority

次のreverse候補としては、Bayesian prior/posteriorより先に **finite multi-parameter candidate grid** を検討します。

実装する場合は最低限、複数unknown parameter、parameterごとのcandidate set、Cartesian product数、hard maximum combination limit、constraint、assignment単位のtie / identifiabilityを明示し、candidate-spaceを暗黙にtruncateまたはsamplingしません。

scalar Gaussianのchecked external JSON envelopeは、第三者利用上の優先度がmulti-parameter analytical capabilityを上回った場合の安全な次候補です。

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします。
