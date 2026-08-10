# 成果還元関数 continuation review

## Purpose

次の実装をPR数ではなく、分析能力、数学的意味、第三者利用、互換性への寄与で選びます。

## Current position

キヨタン側は **forward v1 candidate** を維持します。

セイカタン側は有限candidate / assignmentを中心に、現在5つのreverse contractをproduction化しています。

```text
1. single-parameter transition-count likelihood
2. single-parameter scalar Gaussian likelihood
3. single-parameter transition + scalar composite likelihood
4. finite multi-parameter transition grid
5. finite multi-parameter composite grid
```

Current statistical/search names:

```text
conditional_transition_log_likelihood_without_multinomial_constant
conditionally_independent_gaussian_scalar_log_likelihood
transition_plus_scalar_gaussian_composite_log_likelihood
finite_cartesian_parameter_grid
```

## Five-kind checked external parity

Generic checked dispatcherは全5kindを扱います。

```text
discrete_parameter_candidates
scalar_gaussian_parameter_candidates
composite_parameter_candidates
multi_parameter_transition_grid
multi_parameter_composite_grid
```

Entry points:

```text
parseExternalReverseEstimationDocument
parseExternalReverseEstimationJson
estimateExternalReverseInput
estimateExternalReverseJson
```

Failure boundary:

```text
json_syntax
shape
estimation
```

Parserは引き続き次を行いません。

```text
candidate deduplication
grid truncation / sampling
sigma補完 / epsilon発明
predictor推測
unit変換
constraint auto-clip
transition/scalar evidence partition推測
composite independence assumption推測
observation → parameter直接コピー
```

Duplicate finite candidates、zero finite sigma、eligible gridの`maxCombinations`超過等はshape repairせずtyped estimator semanticsとして拒否します。

## Five-kind result handoff parity

全5kindのchecked resultは:

```text
ExternalReverseMethodResult
→ toReverseResultHandoff
→ ReverseResultHandoff
```

へ接続できます。

Handoffは少なくとも次を保持します。

```text
estimationKind
likelihood / composite / search methods
single parameter selection or multi-parameter assignment selection
method-specific ranking scores
used observations
composite evidence blocks
constraints
explicit assumptions
solver diagnostics where present
raw / eligible / max combination counts where present
priorUsed
posteriorComputed
warnings
limitations
```

Multi-parameter compositeでは4つのmethod layerを同時に保持します。

```text
searchMethod = finite_cartesian_parameter_grid
compositeMethod = transition_plus_scalar_gaussian_composite_log_likelihood
transitionMethod = conditional_transition_log_likelihood_without_multinomial_constant
scalarMethod = conditionally_independent_gaussian_scalar_log_likelihood
```

Assignment rowは:

```text
transitionLogLikelihoodScore
scalarGaussianLogLikelihoodScore
totalLogLikelihoodScore
relativeLikelihoodToBest
scalarDiagnostics
```

を別概念として維持します。

## Multi-parameter composite justification

Generic example:

```text
unknown p = transition success probability
unknown q = success-side quality / value
```

Transition countsは主に`p`へ情報を持ち、scalar expected qualityは`p`と`q`の組合せへ情報を持ちます。

両方未知ならsingle-parameter compositeではjoint assignmentを扱えないため、finite multi-parameter composite gridには独立した分析価値があります。

Implementationは新likelihood式を作らず、complete assignmentをmodelへ注入した上で既存`estimateCompositeParameterCandidates`をper-assignment scorerとして再利用します。

## Search boundary

Multi-parameter transition / compositeとも:

```text
finite Cartesian grid only
mandatory maxCombinations
per-parameter constraints before expansion
rawCombinationCount
eligibleCombinationCount
```

を明示します。

次へ暗黙に切り替えません。

```text
truncation
sampling
random search
adaptive optimization
continuous optimization
```

Tieは:

```text
tied_best_assignments
estimatedAssignment: null
```

として保持します。

Finite-grid identifiabilityはglobal structural identifiabilityではありません。

## Composite evidence boundary

Single / multi compositeともcallerが:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

を明示します。

全ObservationDataset recordをちょうど1つのtransition/scalar evidence blockへ割り当てます。

Transition impossible eventはscalar evidenceで救済しません。

Scalar predictor non-convergenceはlast approximationをlikelihood evidenceへ使用しません。

## Prior / posterior boundary

全current reverse estimatorは:

```text
priorUsed: false
posteriorComputed: false
```

です。

`relativeLikelihoodToBest`はlikelihood ratioでありposterior probabilityではありません。

Transition-count componentのcandidate-independent multinomial constantは省略されています。同じevidence上のranking / relative likelihoodでは相殺されます。

## Causal attribution boundary

Multi-parameter estimation、scenario comparison、sensitivity、candidate/assignment rankingはcausal attributionではありません。

Shapley、ordered marginal、interaction allocation等のmethodを定義しないまま一意の因果寄与へ変換しません。

## What remains unsupported / deferred

現在も以下は未対応または後順位です。

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

## Why Bayesian remains later

具体的なprior情報源がない状態でBayesian semanticsを追加しません。

導入する場合だけ別概念として:

```text
prior mass / density
likelihood
evidence normalization
posterior
```

を実装します。

Existing `relativeLikelihoodToBest`をposteriorへrename / reinterpretしません。

## Test boundary

Testはproduction behavior、数学/統計semantics、互換性、重要failureを保護します。

近接format/copy test追加を目的化しません。

## Handoff reading order

```text
README.md
docs/forward-v1-support-matrix.md
docs/observations.md
docs/discrete-estimation.md
docs/scalar-gaussian-estimation.md
docs/composite-likelihood-estimation.md
docs/multi-parameter-grid-estimation.md
docs/multi-parameter-composite-grid-estimation.md
docs/reverse-external-methods.md
docs/reverse-result-handoff.md
docs/outcome-continuation-review.md
```

## Current completion interpretation

プロジェクトは現在、少なくとも次の区切りまで到達しています。

```text
Kiyotan:
  integrated forward v1 candidate

Seikatan:
  5 finite candidate / assignment reverse methods
  typed production APIs
  one checked external JSON / unknown dispatcher
  one structured result handoff
  explicit non-Bayesian / non-causal boundaries
```

以前の主要gapだった:

```text
typed reverse APIだけ存在して第三者JSONから入れない
methodごとのresultを共通handoffで解釈できない
multiple unknowns + transition + scalar evidenceを同時に扱えない
```

は現在閉じています。

## Next priority

次は新しいstatistical familyを追加する前に、repository全体を走査して**キヨタンforward v1＋有限candidate中心の最小セイカタンをv1相当として固定できるか**を再評価することを第一候補とします。

そのreviewでは少なくとも:

```text
public API coherence
docs / examples / checked input / handoff consistency
versioned schema boundaries
remaining partial TeX/report surfaces
legacy duplicated or obsolete paths
solver / validation / parser error consistency
what is required for a third party to reproduce one complete forward and reverse workflow
```

を確認します。

重大なproduction gapが見つかればそのgapを先に直し、見つからなければv1 completion boundaryを明文化する方向を優先します。

Bayesian semanticsは引き続き後順位です。
