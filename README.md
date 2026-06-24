# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機プロジェクトです。

このリポジトリでは、DefinitionModel → ExpandedModel → EvaluatedModel → SolvedModel → OutputResult → ContributionResult の流れを中核に、期待値・勝率・寄与分解・診断・JSON / TeX / report 境界を段階的に固定します。

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

現在の焦点は、README / docs入口整理と、すごろくPoC v0.4の完了状態を見える形に戻すことです。

Phase 0 の自律進行ルールは `docs/assistant_autonomy.md` と `docs/github_workflow.md` で固定済みです。以降は、デジパチ・獣王・セイカタンを先に拡張せず、すごろくPoC v0.4と汎用モデル層の不足補強へ進みます。

`generatedTo` は diagnostics-only です。solver target は `transition.to` の explicit-only を維持します。`generatedTo` を solver target に使う変更は、専用 solver policy PR まで行いません。

## Implemented core

```text
DefinitionModel
ExpandedModel
EvaluatedModel
SolvedModel
OutputResult
ContributionResult
ProbabilitySpec
RewardSpec
TerminalCondition
TransitionEffect
expandModel
evaluateModel
solveExpectedReward
toOutputResult
toContributionResult
JSON helper
state generation
graph diagnostics
generated target planning boundary
explicit-only solver target policy
TeX / report / boundary digest boundary pieces
```

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
reverse estimation / Seikatan behavior is out of scope for the current phase
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

## Historical / legacy docs notes

README previously contained many one-line docs note checkpoints. They are no longer used as the main entry path.

Those note files remain in `docs/` as historical records unless a later repair PR confirms that a specific file is empty, duplicated, or incorrect. This README now points to the active docs entry set instead of repeating every checkpoint line.

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします.
