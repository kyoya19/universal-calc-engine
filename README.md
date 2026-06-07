# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機プロジェクトです。

このリポジトリでは、まずすごろくPoC v0.3を通じて、DefinitionModel → ExpandedModel → EvaluatedModel → SolvedModel → OutputResult → ContributionResult の最小実装を検証します。

## Current focus

現在の焦点は、すごろくPoC v0.4の境界整理です。

v0.3 は、explicit-only solver execution と state generation / graph diagnostics を併存させる完成チェックリストを回帰テストで固定済みです。

v0.4 では、代表すごろくモデルのfixture化と graph diagnostics 出力整備を優先します。`generatedTo` を solver target にする作業は、引き続き現在の境界外です。

詳細は以下を参照してください。

- [Sugoroku PoC v0.3](docs/sugoroku-poc-v0.3.md)
- [Sugoroku PoC v0.4 Boundary](docs/sugoroku-poc-v0.4-boundary.md)
- [State Space Expansion Design](docs/state-space-expansion.md)

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします。
