# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機プロジェクトです。

DefinitionModel → ExpandedModel → EvaluatedModel → SolvedModel → OutputResult → ContributionResult を中核に、キヨタンforward評価と、観測からparameter candidate / assignmentを順位付けする最小セイカタンreverse estimationを段階的に固定しています。

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

セイカタン側は有限candidate / assignment searchを中心に、transition-count likelihood、scalar Gaussian likelihood、single-parameter composite likelihood、finite multi-parameter transition grid、さらにtyped finite multi-parameter composite gridを持ちます。

既存4 reverse kindにはgeneric checked external input dispatcherとversioned `ReverseResultHandoff` があり、raw resultを変更せずmethod/search、selection、ranking、evidence、constraints、assumptions、diagnostics、prior/posterior status、warnings、limitationsを第三者へ渡せます。

新しいmulti-parameter composite gridはtyped APIを先に安定化するstageであり、checked external kindとhandoff parityは次のfollow-upで追加します。

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

同じcandidate / assignmentへtransition-count evidenceとscalar Gaussian evidenceを使う場合、callerは次のevidence-block仮定を明示しなければなりません。

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

transition componentはcandidate-independentなmultinomial constantを省略しているため、totalはそのconstantまでのlog-likelihood scoreです。candidate / assignment rankingとbestへのlikelihood ratioではconstantが相殺されます。

transition componentがpositive observationに対してprobability 0を与えたcandidate / assignmentは、scalar scoreが有限でもcompositeではimpossibleのままです。scalar predictorが非収束ならそのcandidate / assignmentをlikelihood evidenceへ使いません。

### Finite multi-parameter transition grid

```text
finite_cartesian_parameter_grid
```

複数のdeclared unknown parameterへ有限candidate setを与え、constraint適用後のCartesian productを全列挙して既存transition-count likelihoodでassignmentを順位付けします。

`maxCombinations` は必須です。eligible gridが上限を超える場合は実行前に拒否し、暗黙のtruncate・sampling・random searchへ切り替えません。

複数assignmentがbest scoreでtieした場合は `tied_best_assignments` として返し、`estimatedAssignment` を勝手に1つ選びません。これはsupplied finite grid上のidentifiability情報であり、因果寄与分解ではありません。

### Finite multi-parameter composite grid

Generic use caseとして、unknown transition success probability `p` とunknown success-side quality/value `q` を同時に推定できます。

Transition countsは主に`p`へ情報を持ち、scalar expected qualityは`p`と`q`の組合せへ情報を持つため、両方が未知ならsingle-parameter compositeではjoint assignmentを扱えません。

Search methodは既存と同じ:

```text
finite_cartesian_parameter_grid
```

Per-assignment composite methodは:

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

です。

Grid layerは新しいlikelihood式を定義しません。全parameter assignmentをmodelへ注入し、既存`estimateCompositeParameterCandidates`を1-value anchor candidateで再利用します。

Resultは少なくとも次を分離して保持します。

```text
transitionLogLikelihoodScore
scalarGaussianLogLikelihoodScore
totalLogLikelihoodScore
relativeLikelihoodToBest
```

さらに:

```text
rawCombinationCount
eligibleCombinationCount
maxCombinations
bestAssignments
estimatedAssignment
identifiability
rejectedAssignments
excludedCandidatesByParameter
```

を保持します。

`maxCombinations`は必須です。constraint適用後のeligible gridが上限を超えたら実行前に拒否し、truncate / sample / random search / continuous optimizationへ切り替えません。

Scalar predictor非収束はassignment rejectionです。Transition impossible assignmentはscalar scoreがfiniteでも`possible: false`、`totalLogLikelihoodScore: null`のままです。

Multi-parameter estimationはcausal attributionではありません。

## Checked reverse external path

Generic public path:

```text
external JSON / unknown
→ schemaVersion / estimationKind shape check
→ existing ExternalModelDocument parser
→ existing ObservationDataset parser
→ estimation-specific request shape check
→ existing typed estimator semantics
→ structured result
```

Current checked kinds:

```text
discrete_parameter_candidates
scalar_gaussian_parameter_candidates
composite_parameter_candidates
multi_parameter_transition_grid
```

Public entry points:

```text
parseExternalReverseEstimationDocument
parseExternalReverseEstimationJson
estimateExternalReverseInput
estimateExternalReverseJson
```

Failure stages remain separate:

```text
json_syntax
shape
estimation
```

The parser does not deduplicate candidates, truncate grids, invent sigma, infer predictors, convert units, auto-clip constraints, or infer composite independence assumptions. Estimator-semantic failures remain estimator-semantic failures.

The established discrete-specific checked functions remain available unchanged for compatibility.

The typed `estimateMultiParameterCompositeGrid` is intentionally stabilized before adding a fifth checked `estimationKind`; that parity follow-up must preserve the same parser boundary.

## Reverse result handoff

Previously checked reverse results can be converted into one structured third-party handoff without changing the underlying estimator types.

```text
ExternalReverseMethodResult
→ toReverseResultHandoff
→ ReverseResultHandoff
```

Public helpers:

```text
toReverseResultHandoff
reverseResultHandoffToJson
formatReverseResultHandoffPlainText
```

Success handoffs preserve method/component/search names, selected estimate or assignment, method-specific ranking scores, used observation IDs, composite evidence blocks, constraints, explicit assumptions, solver diagnostics where present, finite-grid search limits where present, `priorUsed`, `posteriorComputed`, warnings, and limitations.

The handoff does not create confidence intervals, credible intervals, posterior probabilities, global structural-identifiability claims, or causal attribution.

`relativeLikelihoodToBest` remains a likelihood ratio. A tie remains a tie. Failed parse/shape/estimation results remain failure handoffs rather than fabricated statistical results.

Multi-parameter composite handoff support follows after its checked external result kind is added.

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

Additional forward analysis:

```text
same model + baseline/candidate parameters
→ scenario comparison (candidate - baseline)
```

```text
same model + baseline + one selected parameter + candidate values
→ one-at-a-time sensitivity
```

scenario差やcontribution差をmethod未定義のまま一意な因果寄与とは扱いません。

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
MultiParameterCompositeGridEstimationRequest / MultiParameterCompositeGridEstimationResult
ExternalReverseMethodDocument / ExternalReverseMethodResult
ReverseResultHandoff
```

Representative operations:

```text
prepareExternalModelInput / prepareExternalModelJson
evaluateExternalModelInput / evaluateExternalModelJson
compareExternalModelScenarios
analyzeParameterSensitivity
parseObservationDataset / validateObservationDataset
estimateDiscreteParameterCandidates
estimateScalarGaussianParameterCandidates
estimateCompositeParameterCandidates
estimateMultiParameterGrid
estimateMultiParameterCompositeGrid
parseExternalReverseEstimationDocument / parseExternalReverseEstimationJson
estimateExternalReverseInput / estimateExternalReverseJson
toReverseResultHandoff
reverseResultHandoffToJson
formatReverseResultHandoffPlainText
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
multi-parameter transition and composite estimation use finite exhaustive grids only
multi-parameter grids require an explicit hard combination limit
tied best assignments are finite-grid non-identifiability only
checked reverse parsing never normalizes statistical input
multi-parameter composite checked-input/handoff parity is pending after typed stabilization
reverse handoff summarizes existing semantics but does not create new inference
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
- [Checked reverse input for current methods](docs/reverse-external-methods.md)
- [Scalar Gaussian reverse estimation](docs/scalar-gaussian-estimation.md)
- [Composite likelihood estimation](docs/composite-likelihood-estimation.md)
- [Finite multi-parameter transition grid estimation](docs/multi-parameter-grid-estimation.md)
- [Finite multi-parameter composite grid estimation](docs/multi-parameter-composite-grid-estimation.md)
- [Reverse result handoff](docs/reverse-result-handoff.md)
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
packages/core/examples/multi_parameter_composite_grid_estimation.ts
packages/core/examples/reverse_result_handoff.ts
```

特定ゲーム固有の値やルールはgeneric coreへ持ち込みません。

## Next priority

Typed finite multi-parameter composite gridがstableになった後の最優先は、checked external inputと`ReverseResultHandoff`へ新しいmulti-parameter composite kindを追加してparityを戻すことです。

そのparityが閉じた後は、新しいstatistical familyを増やす前に、キヨタンforward v1＋有限candidate中心の最小セイカタンをv1相当としてどこまで固定するか再棚卸しします。

Bayesian prior/posteriorは、意味のあるprior mass/densityを供給する具体的use caseが出るまで低優先度を維持します。

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします。
