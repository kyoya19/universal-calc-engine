# 成果還元関数 continuation review

## Purpose

次の実装をPR数ではなく、分析能力、数学的意味、第三者利用、互換性への寄与で選びます。

## Current position

キヨタン側は **forward v1 candidate** を維持します。

セイカタン側は有限candidate / assignmentを中心に、現在少なくとも次をproduction化しています。

```text
conditional_transition_log_likelihood_without_multinomial_constant
conditionally_independent_gaussian_scalar_log_likelihood
transition_plus_scalar_gaussian_composite_log_likelihood
finite_cartesian_parameter_grid
```

既存4 reverse kindにはchecked external JSON / unknown inputとversioned `ReverseResultHandoff`があります。

今回、新たにtyped APIとしてfinite multi-parameter composite gridを追加します。

## Why multi-parameter composite is justified

単なる既存機能の機械的結合ではなく、single-parameter compositeでは表現できないgeneric caseがあります。

例:

```text
unknown A = transition success probability p
unknown B = success-side quality / value q
```

transition countsは主に`p`へ情報を持ちます。

scalar expected qualityは`p`と`q`の組合せへ情報を持ち、単純例では概ね:

```text
expected quality = p * q
```

です。

`p`と`q`が両方未知なら、片方を外部から固定せずsingle-parameter compositeだけでjoint assignmentを順位付けすることはできません。

したがって:

```text
multiple unknown parameters
+ transition-count evidence
+ scalar Gaussian evidence
```

を同時に扱うfinite multi-parameter composite gridには独立した分析価値があります。

## Implementation choice

新しいlikelihood式は導入しません。

Search method:

```text
finite_cartesian_parameter_grid
```

Per-assignment composite method:

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

各eligible assignmentについて全parameter valueをmodelへsupplied valueとして注入し、既存`estimateCompositeParameterCandidates`を1-value anchor candidateで呼びます。

これにより既存実装を再利用します。

```text
transition-count scorer
scalar Gaussian scorer
complete evidence partition
between-block conditional independence
zero-probability impossible event
scalar solver convergence boundary
component score aggregation
```

Grid layer自身の責務は次へ限定します。

```text
parameter dimensions
per-parameter constraints
raw / eligible Cartesian size
mandatory maxCombinations
assignment generation
assignment rejection
assignment ranking
finite-grid identifiability
```

## Multi-parameter composite result

Assignment rowは少なくとも次を保持します。

```text
assignment
possible
transitionLogLikelihoodScore
scalarGaussianLogLikelihoodScore
totalLogLikelihoodScore
relativeLikelihoodToBest
rank
transitionStateScores
scalarObservationScores
scalarDiagnostics
```

Component scoreは一つのunnamed scoreへ潰しません。

Transition componentがpositive observed eventへprobability 0を与えるassignmentは、scalar scoreがfiniteでも:

```text
possible: false
totalLogLikelihoodScore: null
rank: null
```

のままです。

Scalar predictorが非収束ならlast approximationをlikelihood evidenceへ使わず、そのassignmentをrejected assignmentとして扱います。

## Search-space boundary

Requestは2つ以上のdistinct declared parameter dimensionを要求します。

各dimensionはfinite candidate setとoptional min/max constraintを持ちます。

```text
rawCombinationCount
eligibleCombinationCount
maxCombinations
```

を明示します。

ConstraintはCartesian materialization前に適用します。

Eligible combinationsが`maxCombinations`を超える場合は実行前に拒否します。

次は行いません。

```text
grid truncation
sampling
random search
adaptive optimization
continuous fallback
candidate deduplication
constraint auto-clip
```

## Identifiability boundary

Resultは既存finite gridと同じく:

```text
unique_best_assignment
tied_best_assignments
no_possible_assignment
```

を返します。

Tieの場合、`estimatedAssignment`を勝手に一つ選びません。

これはsupplied finite eligible grid上のidentifiabilityだけを意味します。

Global structural identifiabilityでも因果寄与分解でもありません。

## Evidence / independence boundary

Transition evidenceとscalar evidenceは既存single-parameter compositeと同じ明示的partitionを使います。

Callerは:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

を明示しなければなりません。

Parserやgrid layerがこの仮定を推測することは禁止します。

## Prior / posterior boundary

Current multi-parameter composite resultも:

```text
priorUsed: false
posteriorComputed: false
```

です。

`relativeLikelihoodToBest`はlikelihood ratioでありposterior probabilityではありません。

Transition multinomial constantは既存transition scorerと同じくcandidate-independent部分を省略しています。したがってcomposite totalはそのcommon constantまでのscoreですが、同じevidence上のassignment rankingとlikelihood ratioではconstantが相殺されます。

## Current parity gap

このstageではmulti-parameter compositeを**typed estimatorとして先に安定化**します。

既存generic checked reverse dispatcherと`ReverseResultHandoff`は、現時点では以前の4 kindsを扱っています。

Typed estimatorがCI-stableになった後、次の1つの意味あるfollow-upとして:

```text
multi_parameter_composite_grid
```

をchecked external reverse kindへ追加し、同じkindを`ReverseResultHandoff`へ追加します。

その際もparserは以下を行いません。

```text
candidate deduplication
sigma補完 / epsilon発明
predictor推測
unit変換
constraint clip
grid truncation / sampling
independence assumption推測
```

## Causal attribution boundary

Multi-parameter estimationはmulti-parameter causal attributionではありません。

Shapley、ordered marginal、interaction allocation等のmethodを定義しないままparameter assignmentを一意の因果寄与へ分解しません。

## Bayesian prior / posterior

引き続き低優先度です。

具体的なprior情報源がない状態で導入しません。

導入する場合だけ別概念として:

```text
prior mass / density
likelihood
evidence normalization
posterior
```

を実装します。

既存`relativeLikelihoodToBest`をposteriorへrename / reinterpretしません。

## Unsupported / deferred

現在も以下は後回しです。

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

## Next priority

Typed multi-parameter composite gridが最終CIを通ってmergeされた後、最優先は**checked external inputとReverseResultHandoffのparity回復**です。

そのparityが閉じた後は、新しいstatistical familyを増やす前に、キヨタンforward v1＋有限candidate中心の最小セイカタンをv1相当としてどこまで固定するかを再棚卸しします。

Bayesian semanticsは引き続き後順位です。
