# 成果還元関数 continuation review

## Purpose

次の実装をPR数ではなく、分析能力、数学的な意味の明確さ、第三者利用、互換性への寄与で選びます。

## Current position

キヨタン側は **forward v1 candidate** を維持します。

セイカタン側は、有限candidate / assignmentを中心に次のreverse contractをproduction化しています。

```text
conditional_transition_log_likelihood_without_multinomial_constant
conditionally_independent_gaussian_scalar_log_likelihood
transition_plus_scalar_gaussian_composite_log_likelihood
finite_cartesian_parameter_grid
```

全current reverse methodはchecked external JSON / unknown inputから到達可能です。

## Checked external reverse path

Generic dispatcher:

```text
discrete_parameter_candidates
scalar_gaussian_parameter_candidates
composite_parameter_candidates
multi_parameter_transition_grid
```

Entry points:

```text
parseExternalReverseEstimationDocument
parseExternalReverseEstimationJson
estimateExternalReverseInput
estimateExternalReverseJson
```

Boundary:

```text
json_syntax
shape
estimation
```

Parserはcandidate deduplication、sigma補完、predictor推測、unit変換、constraint clip、grid truncation / sampling、independence assumption推測を行いません。

## Reverse result handoff

現在の最大の第三者利用gapは、methodごとの詳細resultを同じ解釈語彙で受け渡すsurfaceがないことでした。

そのため、raw estimatorを変更せず次のsummary boundaryを追加します。

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

成功summaryは少なくとも次を保持します。

```text
estimationKind
methods / searchMethod
selection
ranking
used observations
constraints
assumptions
search limits when applicable
priorUsed
posteriorComputed
warnings
limitations
```

method-specific scoreはgenericな1フィールドへ潰しません。

Compositeでは次を別々に保持します。

```text
transitionLogLikelihoodScore
scalarGaussianLogLikelihoodScore
totalLogLikelihoodScore
```

Scalar / compositeでは既存solver diagnosticsもranking rowへ残します。

Multi-parameter gridでは次を保持します。

```text
rawCombinationCount
eligibleCombinationCount
maxCombinations
bestAssignments
estimatedAssignment
identifiability
```

Failure summaryは成功resultを捏造せず、次だけを引き継ぎます。

```text
stage
estimationKind when available
estimationStage when available
issues
```

## Interpretation boundaries

現在の全reverse pathは引き続き非Bayesianです。

```text
priorUsed: false
posteriorComputed: false
```

`relativeLikelihoodToBest` はposterior probabilityではありません。

Handoffは次のlimitationをmachine-readableにできます。

```text
finite_candidate_space_only
relative_likelihood_is_not_posterior_probability
no_confidence_or_credible_interval_computed
no_causal_attribution_computed
transition_multinomial_constant_omitted
scalar_units_require_exact_match_no_conversion
finite_grid_identifiability_only
```

これらは既存resultの意味を変更せず、第三者が誤読しやすい境界を明示するものです。

## Multi-parameter composite candidate

Multi-parameter compositeにはgeneric justificationがあります。

例:

```text
unknown A = transition success probability
unknown B = success-side value / quality scale
```

transition countsはAへ強い情報を持ち、scalar expected quality / costはAとBの組合せへ情報を持ちます。

この場合、

```text
multiple unknown parameters
+ transition-count evidence
+ scalar Gaussian evidence
```

を同時に使うことで、single-parameter compositeでは表現できない分析価値があります。

したがってmulti-parameter compositeは単なる機能の機械的結合ではなく、次のanalytical candidateとして正当化できます。

ただし実装時は以下を維持する必要があります。

```text
searchMethod != likelihood/composite method
finite Cartesian grid only
mandatory maxCombinations
no silent truncation / sampling
complete evidence partition
explicit between-block conditional independence
existing scalar predictor / sigma / unit contract
transition impossible events remain impossible
scalar non-convergence is not evidence
assignment rejection remains explicit
component scores remain separate
relativeLikelihoodToBest remains likelihood ratio
finite-grid identifiability only
```

可能な限り既存`estimateCompositeParameterCandidates`をper-assignment scorerとして再利用し、新しいtransition/scalar確率式を複製しないことを優先します。

## Why handoff comes first

Multi-parameter compositeは一部の分析能力を拡張します。

Reverse result handoffは現在存在する **全4 reverse method** の第三者理解、API handoff、reporting、デバッグへ同時に効きます。

そのため現時点では、handoff boundaryを先に完成させる方がv1完成度への寄与が大きいと判断します。

## Bayesian prior / posterior

引き続き低優先度です。

具体的なprior情報源がない状態で導入しません。

導入する場合だけ、次を別概念として実装します。

```text
prior mass / density
likelihood
evidence normalization
posterior
```

既存`relativeLikelihoodToBest`のrename / reinterpretationは禁止します。

## Unsupported / deferred

現在も以下は未対応または後回しです。

- continuous / adaptive optimization;
- Bayesian prior/posterior;
- MCMC;
- variational inference;
- hidden-state inference;
- automatic variance estimation;
- correlated scalar errors;
- general non-Gaussian scalar likelihoods;
- confidence / credible intervals;
- automatic unit conversion;
- method未定義のmulti-parameter causal attribution;
- large digipachi / Juoh domain models as core commitments;
- GUI / monetization implementation.

## Causal attribution boundary

Multi-parameter estimation、scenario差、candidate rankingは因果寄与分解ではありません。

Shapley、ordered marginal、interaction allocation等のmethodを定義しないまま、一意の因果寄与へ変換しません。

## Test boundary

新しいtestはproduction behavior、数学/統計semantics、互換性、重要failureを保護するものを優先します。

近接したformat/copy testの追加を目的化しません。

## Handoff reading order

```text
README.md
docs/forward-v1-support-matrix.md
docs/observations.md
docs/discrete-estimation.md
docs/scalar-gaussian-estimation.md
docs/composite-likelihood-estimation.md
docs/multi-parameter-grid-estimation.md
docs/reverse-external-methods.md
docs/reverse-result-handoff.md
docs/outcome-continuation-review.md
```

## Next priority after this handoff

Reverse result handoffがCIを通ってmergeされた後は、次を比較します。

1. finite multi-parameter composite grid;
2. handoffの追加renderer / consumer contractが実際に不足しているか;
3. generic coreの別の重大gap。

Multi-parameter compositeは上記generic use caseで正当化可能ですが、既存handoffがまず安定したことを確認してからproduction化します。

Bayesian semanticsは引き続き後順位です。
