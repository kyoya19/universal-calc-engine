# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機／成果還元関数のcore repositoryです。

現在の分析coreは、

```text
Kiyotan forward v1
+
finite-candidate / finite-assignment centered Seikatan v1
```

として **functional-contract v1 boundary** に到達しています。

Current qualified analytical subject:

```text
subject-public-8b341032516a
8b341032516a2f5108170743c4dafd8fde31a229
```

Authoritative completion / distribution review:

- [Current-generation consumer quickstart](docs/current-generation-consumer-quickstart.md)
- [Qualified scope status](docs/qualified-scope-status.md)
- [Promoted Showcase guide](docs/promoted-showcases.md)
- [External distribution contract v1](docs/distribution-contract-v1.md)
- [Historical package 1.0.0 API manifest](docs/package-api-v1.json)
- [v1 completion boundary](docs/v1-completion-boundary.md)
- [v1 support matrix and handoff map](docs/forward-v1-support-matrix.md)

## Current package distribution

The current qualified API generation is distributed as:

```text
package: universal-calc-engine
package 1.1.0
registry: npm public registry
module contract: ESM only
runtime dependencies: zero
analytical subject: subject-public-8b341032516a
```

The historical package 1.0.0 remains an immutable earlier distribution identity. The 1.1.0 release is a compatible additive distribution of the already-qualified current Public API generation; it does not redefine analytical semantics or rewrite the historical 1.0.0 artifact.

Install the exact current qualified version from the public registry:

```bash
npm install universal-calc-engine@1.1.0
```

Package-name ESM import:

```ts
import {
  evaluateExternalModelJson,
  estimateExternalReverseJson,
  toForwardResultHandoff,
  toReverseResultHandoff
} from 'universal-calc-engine';
```

The current distribution qualifies Linux x64 consumer execution on these Node lines:

```text
>=22.14.0 <23
>=24.0.0 <25
```

The package ships TypeScript declarations through `./dist/index.d.ts` and the root `exports` map. CommonJS `require` and undocumented deep imports are unsupported.

For external JSON or otherwise untrusted input, use the checked facade rather than treating parsing as validation. For third-party output, prefer the versioned forward/reverse handoff helpers and preserve `status`, validation issues, warnings, limitations, ambiguity, and convergence state.

A successful forward evaluation can still report `converged: false`; its last approximation must not be presented as converged. Reverse ties must remain ties, and `relativeLikelihoodToBest` is not posterior probability.

See [Current-generation consumer quickstart](docs/current-generation-consumer-quickstart.md) for the concise package-name consumer path.

The package is qualified from an independently installed exact packed artifact: clean consumer install, package-name runtime import, TypeScript declaration compile, current Showcase-required API availability, root export/declaration consistency, normalized artifact reproducibility, and publication provenance linkage.

The current package API manifest and root runtime/declaration manifests are regenerated as qualification evidence for 1.1.0. The committed `docs/package-api-v1.json` remains the historical package 1.0.0 compatibility snapshot.

See [External distribution contract v1](docs/distribution-contract-v1.md) for the distribution boundary and Gate DIST-v1 rules.

## Current Closed-Loop Showcase and npm 1.1.0

The ORF Closed-Loop Foundation Showcase uses already-qualified Public APIs that are present in `universal-calc-engine@1.1.0`.

The checked-in Showcase still runs its repository fixture, runner, and independently fixed expected result from the source-tree build because those example artifacts are not shipped inside the npm package. This repository execution path is not an API-surface limitation of package 1.1.0.

The earlier package `1.0.0` predates the current Candidate A-through-AJ root API surface. That historical limitation must not be projected onto the current 1.1.0 distribution.

See [Closed-Loop Foundation Showcase](examples/showcase/closed-loop-foundation/README.md).

## License / Commercial Use

Copyright (c) 2026 Kyoya Sato. All rights reserved.

This repository and public package are source-available for review, study, and non-commercial evaluation only.

Commercial use is not permitted without a prior written paid license from the copyright holder.

Commercial use includes, but is not limited to, use in paid products or services, SaaS, web services, applications, commercial tools, consulting, paid analysis reports, business deliverables, client work, redistribution, sublicensing, modification for commercial purposes, or incorporation into proprietary systems, commercial decision-support systems, or internal business systems.

Public npm availability does not grant commercial-use permission.

For details, see [Commercial License Notice](COMMERCIAL-LICENSE.md).

## ライセンス / 商用利用

本リポジトリおよび公開packageは、閲覧・研究・非商用評価のために公開する source-available project です。

権利者による事前の書面許諾および有料ライセンスなしに、商用利用することを禁止します。

Public registryからpackageを取得できることは、商用利用許諾を意味しません。

商用利用を希望する場合は、利用前にリポジトリ所有者へ連絡してください。

## v1 の意味

このrepositoryでいうanalytical functional-contract v1は、**分析機能・数学/統計semantics・checked input・structured result・third-party handoff・互換境界が一続きに固定された状態**を指します。

npm package `1.1.0`はcurrent distribution identityで、historical package `1.0.0`は先行するimmutable distribution identityです。analytical subjectとdistribution subjectは別registry identityとして管理します。

Package-only metadata/build/release changesはanalytical subjectを更新しません。runtime/API/schema/solver/statistical semanticsが変化する場合だけ、change-control authorityに従ってtargeted analytical requalificationへ戻ります。

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

## Current generic checked reverse kinds

```text
discrete_parameter_candidates
scalar_gaussian_parameter_candidates
composite_parameter_candidates
multi_parameter_transition_grid
multi_parameter_composite_grid
```

These are the generic checked-dispatcher methods, not an exhaustive list of every qualified current-generation finite hidden-state/trajectory API exported at the package root.

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

The historical package 1.0.0 root compatibility snapshot remains machine-readable in `docs/package-api-v1.json`; current 1.1.0 API/export manifests are generated by Distribution Qualification.

## Primary docs

### Current consumer / distribution

- [Current-generation consumer quickstart](docs/current-generation-consumer-quickstart.md)
- [Qualified scope status](docs/qualified-scope-status.md)
- [External distribution contract v1](docs/distribution-contract-v1.md)
- [Closed-Loop Foundation Showcase](examples/showcase/closed-loop-foundation/README.md)
- [Closed-Loop Foundation technical provenance](docs/showcase/closed-loop-foundation.md)

### v1 authority / historical compatibility

- [Promoted Showcase guide](docs/promoted-showcases.md)
- [Historical package 1.0.0 API manifest](docs/package-api-v1.json)
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

## Explicit analytical partial / post-v1 areas

Current qualified analytical scope does not claim completion for:

```text
complete TeX/report renderer
transition effects beyond set_property
exact/closed-form solver family
automatic unit conversion/general dimensional algebra
continuous inference
continuous/adaptive optimization
Bayesian prior/posterior
MCMC / variational inference
confidence / credible intervals
hidden-state inference outside the documented qualified finite hidden-state contracts
causal inference / undefined Shapley attribution
GUI / web product layer
large digipachi / Juoh core models
```

These are not silent omissions; they are explicit partial or post-v1 boundaries. Qualified finite hidden-state APIs do not imply unrestricted hidden-state inference over arbitrary model classes.

Package publication does not change these boundaries.

## Verification

Repository hygiene:

```bash
npm run typecheck
npm test
npm run build
npm run package:check
npm run audit:production
```

Distribution qualification additionally runs clean-consumer and supported-Node matrix verification under Gate DIST-v1.

## Change control

Do not add another statistical family by roadmap momentum alone.

Distribution work is controlled by `ORF-DISTRIBUTION-CONTRACT-v1`; analytical capability changes remain controlled by `ORF-CURRENT-SCOPE-COMPLETION-v1`.

Package-only changes do not authorize Wave 4, Level 9, known-limitation resolution, Public analytical scope expansion, or a new Showcase candidate.

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンです。
