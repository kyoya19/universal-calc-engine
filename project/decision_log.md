# decision_log

## 2026-06-07

### 決定

サイコロPoCを最優先にする。

### 理由

獣王PoCやセイカタンへ進む前に、以下の処理線が通るかを確認する必要がある。

```text
DefinitionModel
→ ExpandedModel
→ EvaluatedModel
→ SolvedModel
→ OutputResult
→ ContributionResult
```

### 採用方針

- サイコロPoCは、すごろくPoC v0.3の最小検査として扱う。
- solverにサイコロ専用・すごろく専用ロジックを混ぜない。
- known / estimated / assumed / unknown の分離は、獣王PoCから本格適用する。
- セイカタンは、順方向モデルが通ってから着手する。

### 禁止事項

- handoff/ ディレクトリを作らない。
- ツモロジを主目的にしない。
- いきなり獣王実装へ進まない。
- いきなりセイカタンへ進まない。
- 推定値を確定値として扱わない。
