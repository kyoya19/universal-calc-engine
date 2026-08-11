# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機／成果還元関数のcore repositoryです。

現在の分析coreは、

```text
Kiyotan forward v1
+
finite-candidate / finite-assignment centered Seikatan v1
```

として **functional-contract v1 boundary** に到達しています。

Authoritative completion review:

- [Qualified scope status](docs/qualified-scope-status.md)
- [v1 completion boundary](docs/v1-completion-boundary.md)
- [v1 support matrix and handoff map](docs/forward-v1-support-matrix.md)

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

## v1 の意味

このrepositoryでいうv1は、**分析機能・数学/統計semantics・checked input・structured result・third-party handoff・互換境界が一続きに固定された状態**を指します。

これはnpm package release `1.0.0`を意味しません。

Root `package.json`は現在もprivate development package metadataです。Package publishing / exports map / semantic versioningは別のdistribution workとして扱います。

## Core pipeline

Forwardの基礎pipeline:

```text
DefinitionModel
→ ExpandedModel
→ EvaluatedModel
→ solver outputs
→ OutputResult / ContributionResult
```

第三者向けには直接内部pipelineを組み立てるより、checked facade / handoffを推奨します。

## Complete forward v1 path

```text
external JSON / unknown
→ checked model input
→ parameter / formula resolution
→ structured validation
→ expand / evaluate
→ expected reward
→ expected elapsed time
→ optional reachability
→ ratio-of-expectations reward rate
→ contribution
→ optional named reward axes
→ convergence diagnostics
→ ForwardEvaluationResult
→ ForwardResultHandoff
```

Preferred entry points:

```text
evaluateExternalModelInput
evaluateExternalModelJson
toForwardResultHandoff
forwardResultHandoffToJson
formatForwardResultHandoffPlainText
```

Representative complete example:

```text
packages/core/examples/forward_result_handoff.ts
```

### Forward result handoff

Versioned handoff:

```text
schemaVersion: 1
kind: forward_evaluation_handoff
```

It preserves:

```text
modelKind
converged
validation
expectedReward
expectedElapsedTime
rewardRate
contribution
diagnostics
optional reachability
optional named reward axes
warnings
limitations
```

### Forward mathematical boundaries

Reward rate:

```text
rateKind = ratio_of_expectations
E[reward] / E[elapsed time]
```

It is not `E[reward / elapsed time]`.

Reachability is generic target-state probability, not automatically a domain-specific win probability.

Named reward axes remain independent; the core does not silently net axes or convert units.

Contribution rows, scenario differences, and sensitivity are descriptive analytical outputs, not automatically causal attribution.

A valid forward evaluation can return:

```text
ok: true
converged: false
```

with explicit solver diagnostics and the last approximation. Non-convergence is never hidden.

Additional forward analyses:

```text
compareExternalModelScenarios
analyzeParameterSensitivity
```

Scenario comparison uses `candidate - baseline`.

One-at-a-time sensitivity changes one selected parameter while other supplied baseline parameter values remain fixed.

## Observation boundary

`ObservationDataset` is a first-class evidence surface separate from:

```text
model definition
supplied parameter values
evaluated values
forward result
reverse estimate
```

Current records:

```text
state_count
transition_count
scalar
```

Observations are not copied directly into model parameters by the checked reverse parser.

## Complete Seikatan v1 path

```text
external reverse JSON / unknown
→ checked model + ObservationDataset + request
→ selected typed reverse estimator
→ structured reverse result
→ ReverseResultHandoff
```

Preferred generic entry points:

```text
parseExternalReverseEstimationDocument
parseExternalReverseEstimationJson
estimateExternalReverseInput
estimateExternalReverseJson
toReverseResultHandoff
reverseResultHandoffToJson
formatReverseResultHandoffPlainText
```

Representative complete example:

```text
packages/core/examples/multi_parameter_composite_external_handoff.ts
```

## Current reverse kinds

```text
discrete_parameter_candidates
scalar_gaussian_parameter_candidates
composite_parameter_candidates
multi_parameter_transition_grid
multi_parameter_composite_grid
```

### Transition-count likelihood

```text
conditional_transition_log_likelihood_without_multinomial_constant
```

For observed count `k` and candidate transition probability `p`:

```text
score = sum k * log(p)
```

The candidate-independent multinomial constant for the same evidence is omitted.

### Scalar Gaussian likelihood

```text
conditionally_independent_gaussian_scalar_log_likelihood
```

The caller explicitly supplies:

```text
observation binding
model-side predictor
Gaussian sigma
unit
```

The parser does not invent sigma, epsilon, predictor mapping, or unit conversion.

### Composite likelihood

```text
transition_plus_scalar_gaussian_composite_log_likelihood
```

Required explicit assumption:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

Every observation must belong to exactly one evidence block.

A transition impossible event is not rescued by finite scalar evidence.

A non-converged scalar predictor is not used as successful likelihood evidence.

### Multi-parameter search

```text
finite_cartesian_parameter_grid
```

Both transition and composite multi-parameter estimators require:

```text
finite candidate dimensions
per-parameter constraints
mandatory maxCombinations
rawCombinationCount
eligibleCombinationCount
unique / tied / no-possible finite-grid identifiability
```

No silent truncation, sampling, adaptive search, or continuous fallback occurs.

Multi-parameter composite reuses the existing single-parameter composite scorer per assignment; it does not define another likelihood formula.

## Reverse checked parser boundary

The generic parser keeps:

```text
json_syntax
shape
estimation
```

separate.

It deliberately does not:

```text
deduplicate candidates
truncate or sample grids
invent or repair sigma
infer predictors from metric names
convert units
auto-clip constraints
infer evidence partition
infer independence assumptions
copy observations into parameters
```

The older discrete-specific checked API remains available for compatibility.

## Reverse result handoff

Versioned handoff:

```text
schemaVersion: 1
kind: reverse_estimation_handoff
```

It preserves method/search identity, estimate/assignment, ranking, evidence, constraints, assumptions, component scores, diagnostics where applicable, finite-grid limits/identifiability, warnings, limitations, and:

```text
priorUsed: false
posteriorComputed: false
```

`relativeLikelihoodToBest` remains a likelihood ratio to the best supplied finite candidate/assignment. It is not posterior probability.

Finite-grid identifiability is not proof of global structural identifiability.

Multi-parameter estimation is not causal attribution.

## Public TypeScript root

Current core exports are collected in:

```text
packages/core/src/index.ts
```

Historical/direct APIs remain exported for compatibility. The preferred v1 third-party paths are the checked facade + versioned handoff paths described above.

## Primary docs

### v1 authority

- [Qualified scope status](docs/qualified-scope-status.md)
- [v1 completion boundary](docs/v1-completion-boundary.md)
- [v1 support matrix and handoff map](docs/forward-v1-support-matrix.md)
- [Continuation / post-v1 policy](docs/outcome-continuation-review.md)

### Forward

- [External model input](docs/external-input.md)
- [Forward evaluation](docs/forward-evaluation.md)
- [Forward result handoff](docs/forward-result-handoff.md)
- [Scenario comparison](docs/scenario-comparison.md)
- [One-at-a-time sensitivity](docs/parameter-sensitivity.md)
- [Named reward axes](docs/reward-axes.md)
- [Structured validation](docs/structured-validation.md)
- [Solver diagnostics](docs/solver-diagnostics.md)
- [Parameterized scalars](docs/parameterized-scalars.md)

### Reverse

- [Observation input](docs/observations.md)
- [Discrete estimation](docs/discrete-estimation.md)
- [Scalar Gaussian estimation](docs/scalar-gaussian-estimation.md)
- [Composite likelihood estimation](docs/composite-likelihood-estimation.md)
- [Finite multi-parameter transition grid](docs/multi-parameter-grid-estimation.md)
- [Finite multi-parameter composite grid](docs/multi-parameter-composite-grid-estimation.md)
- [Checked reverse methods](docs/reverse-external-methods.md)
- [Reverse result handoff](docs/reverse-result-handoff.md)

## Representative examples

```text
packages/core/examples/forward_evaluation.ts
packages/core/examples/forward_result_handoff.ts
packages/core/examples/scenario_comparison.ts
packages/core/examples/discrete_estimation.ts
packages/core/examples/scalar_gaussian_estimation.ts
packages/core/examples/composite_likelihood_estimation.ts
packages/core/examples/multi_parameter_grid_estimation.ts
packages/core/examples/multi_parameter_composite_grid_estimation.ts
packages/core/examples/multi_parameter_composite_external_handoff.ts
packages/core/examples/reverse_result_handoff.ts
```

特定ゲーム固有の値やルールはgeneric coreへ持ち込みません。

## Explicit partial / post-v1 areas

Current v1 does not claim completion for:

```text
npm/package distribution 1.0
complete TeX/report renderer
transition effects beyond set_property
exact/closed-form solver family
automatic unit conversion/general dimensional algebra
continuous/adaptive optimization
Bayesian prior/posterior
MCMC / variational inference
confidence / credible intervals
hidden-state inference
undefined Shapley / causal attribution
GUI / web product layer
large digipachi / Juoh core models
```

These are not silent omissions; they are explicit partial or post-v1 boundaries.

## Verification

```bash
npm run typecheck
npm test
```

## Next work

Do not add another statistical family by roadmap momentum alone.

After v1, new work should start from a concrete requirement such as:

```text
external distribution/package hardening
a real generic/domain application exposing a missing core capability
a separately justified analytical method with explicit semantics
```

If no such requirement exists, the current v1 safe point should be maintained rather than expanded mechanically.

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンです。
