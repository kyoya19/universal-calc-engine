# universal-calc-engine

汎用確率状態遷移モデルに基づく万能計算機プロジェクトです。

このリポジトリでは、まずすごろくPoC v0.3を通じて、DefinitionModel → ExpandedModel → EvaluatedModel → SolvedModel → OutputResult → ContributionResult の最小実装を検証します。

## Current focus

現在の焦点は、すごろくPoC v0.3です。

v0.3 の完成境界は、`generatedTo` を solver target にすることではありません。

v0.3 では、solver は explicit-only 実行を維持し、`transition.to` を正として使います。`effects[]` 由来の generated candidate / `generatedTo` は、状態生成・graph diagnostics・summary のために使います。

詳細は以下を参照してください。

- [Sugoroku PoC v0.3](docs/sugoroku-poc-v0.3.md)
- [State Space Expansion Design](docs/state-space-expansion.md)

## Verification

```bash
npm run typecheck
npm test
```

本プロジェクトはツモロジ（仮）のマネタイズ企画そのものではなく、同企画にも利用され得る中核計算エンジンの実装を目的とします。
