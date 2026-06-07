# restart_prompt_latest

このスレッドは「万能計算機プロジェクト」の実装開始用である。

GitHub App 設定は完了済み。
確認済みリポジトリ：

```text
kyoya19/universal-calc-engine
```

目的：

```text
ツモロジ（仮）のマネタイズ企画ではなく、汎用確率状態遷移モデルに基づく万能計算機そのものを実装する。
```

現在の決定：

```text
サイコロPoCを最優先にする。
サイコロPoCは、すごろくPoC v0.3の最小検査として扱う。
```

最初に通す処理線：

```text
DefinitionModel
→ ExpandedModel
→ EvaluatedModel
→ SolvedModel
→ OutputResult
→ ContributionResult
```

次に進める順序：

```text
1. サイコロPoC v0.3
2. 四号機獣王PoC v0.1 公開解析値整合モデル
3. キヨタン順方向検証
4. セイカタン最小逆方向推定
5. キヨタン／セイカタン往復評価
```
