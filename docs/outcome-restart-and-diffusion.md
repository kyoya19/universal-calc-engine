# 成果還元関数 再開・拡散・引き継ぎガイド

## Purpose

この文書は、成果還元関数プロジェクトを、将来の自分、協力者、非技術支援者、別スレッドのAI、GitHub参加者が再開しやすくするための入口です。

直近のGitHub作業では、JSON/copy/report/status/number textなどの境界テストを多く追加しました。これらは回帰防止として有効ですが、以後は小さい境界テストの反復だけを主目的にしません。

次の主目的は、成果還元関数としての再開性、拡散性、参加者向け説明、そしてMinimal Kiyotan forward engineへつながるproduction機能です。

## Core idea

成果還元関数は、結果だけでなく、状態、遷移、判断、確率、報酬、時間、観測値、仮定、診断、寄与を分けて扱い、成果へどの要素がどう還元されたかを説明するための汎用評価モデルです。

このプロジェクトでは、以下を混ぜないことを重視します。

```text
known      = 確定している入力または結果
estimated  = 観測データから推定した値
assumed    = 仮に置いた前提
unknown    = まだ分からない値
```

また、セイカタン側では次の考え方を重視します。

```text
見たものを捨てない
見たものを過大評価しない
```

つまり、観測サンプルを単純な採用/除外だけで扱わず、重み、有意性、誤差、過大評価リスクを明示して残すことを目指します。

## Kiyotan and Seikatan

### Kiyotan

キヨタンは順方向評価です。

定義済みモデルから、期待値、到達確率、勝率、時給、寄与分解、診断、JSON/report/TeX出力を計算する方向です。

現在のGitHub実装は、こちらの基礎に近い状態です。

### Seikatan

セイカタンは逆方向推定です。

観測データから、確率、報酬、条件、判断寄与、誤差、重み、有意性を推定する方向です。

セイカタンは重要ですが、順方向のキヨタン基盤がもう少し固まった後に扱います。

## Current status

現在の主な基盤は以下です。

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
JSON helpers
report boundaries
TeX/report/digest pieces
explicit-only solver target policy
```

すごろくPoC v0.4と汎用境界補強は、十分に進んでいます。

これ以降は、JSON/copy境界テストだけを探して小PRを積む進め方を原則として止め、成果還元関数として役立つ機能、説明、参加導線を優先します。

## Example applications

成果還元関数は、特定の遊技やゲームだけの計算機ではありません。

応用例は以下です。

```text
- すごろくPoC
- 卓球などのスポーツ判断
- パチンコの回転単価、時給、止め打ち寄与、持ち玉比率
- パチスロの期待値、勝率、設定推定、技術介入寄与
- ゲームバランス評価
- 学習計画や練習計画の成果分解
- 営業判断や事業判断の寄与分析
- 観測値と仮定を分ける分析レポート
```

公開GitHub上では、まず汎用モデルと安全な代表PoCを優先します。デジパチ、獣王、その他の実戦サンプルは後段の代表例として扱います。

## Participant guide

### For technical contributors

まずREADME、この文書、`docs/sugoroku-poc-v0.4-boundary.md`、`docs/outcome-roadmap.md`を読んでください。

次に取り組む場合は、小さいJSON/copy境界テストを無制限に追加するのではなく、次のどれかに寄与するPRを優先します。

```text
1. Minimal Kiyotan forward engine
2. reachability / win probability / 到達確率
3. time-aware reward / 時間評価
4. multi-axis reward / 複数成果軸
5. solver diagnostics / 収束診断
6. validation result / 入力診断
7. usable JSON/report contract / GUIへ渡せる契約
```

### For collaborators

このプロジェクトは、特定ジャンル専用の計算ではなく、状態、遷移、観測、仮定、評価結果を分ける成果評価基盤です。

協力者へ渡す場合は、次の観点で見てください。

```text
- 何を入力できるか
- 何を計算できるか
- どの値が確定、推定、仮定、未確定か
- どの判断が成果へどれだけ寄与したか
- 他分野へ説明できるか
```

### For non-technical support

コードを読めない人は、まず以下だけを確認してください。

```text
- README
- この文書
- docs/outcome-roadmap.md
```

そして、ChatGPTなどに次のように依頼してください。

```text
このGitHubリポジトリのREADME、docs/outcome-restart-and-diffusion.md、docs/outcome-roadmap.mdを読み、成果還元関数プロジェクトの目的、現在地、次にやるべきことを日本語で説明してください。コード変更はまだしないでください。
```

## Prompt examples for AI handoff

### Project restart prompt

```text
kyoya19/universal-calc-engine の成果還元関数プロジェクトを再開します。

まず README、docs/outcome-restart-and-diffusion.md、docs/sugoroku-poc-v0.4-boundary.md、docs/outcome-roadmap.md を読んでください。

現在は、JSON/copy境界テストを細かく積む段階から、Minimal Kiyotan forward engine に近づく段階へ移ります。

小さい境界テストを無制限に追加せず、次の優先順位で進めてください。

1. open PR があれば CI とmerge可否を確認する
2. 境界補強が十分なら一区切りにする
3. 到達確率、勝率、時間評価、複数成果軸、solver診断、validation結果のいずれかを小さく実装する
4. production code変更には対応するテストを付ける
5. デジパチ、獣王、セイカタン、GUIは後段として扱う
```

### Specification-to-code prompt

```text
過去会話ではなく、まずGitHub内のREADMEとdocsを基準にしてください。

成果還元関数の目的に沿って、仕様書を小さく更新してから、その仕様に従ってTypeScript実装とテストを追加してください。

known / estimated / assumed / unknown を混ぜないでください。

迷った場合は、より小さく、CIで検証しやすく、既存のDefinitionModel -> ExpandedModel -> EvaluatedModel -> SolvedModel -> OutputResult -> ContributionResultの流れを壊さないPRを選んでください。
```

### Review prompt

```text
このPRが、成果還元関数の次フェーズに本当に寄与しているかを確認してください。

特に、単なるJSON/copy境界テストの追加だけになっていないか、Minimal Kiyotan forward engineへ近づいているか、known / estimated / assumed / unknown を混ぜていないかを確認してください。
```

## Anti-drift rules

以下は迷子防止のためのルールです。

```text
- 小さいJSON/copy境界テストだけを延々と追加しない
- すごろくPoC v0.4をいつまでも未完了扱いしない
- デジパチ、獣王、実戦サンプルを早く触りすぎない
- セイカタンを順方向基盤より先に大きく進めない
- GUIやマネタイズ説明を中核実装境界と混ぜない
- 推定値、仮定値、確定値を同じ値として扱わない
- docsだけを増やしてproduction機能へ進まない
- production機能を追加するときは対応するテストを付ける
```

## Recommended next phase

次の技術フェーズは、Minimal Kiyotan forward engineです。

最初のproduction候補は以下です。

```text
1. reachability / 到達確率
2. win probability / 勝率
3. time-aware reward / 時間を含む成果評価
4. multi-axis reward / 複数成果軸
5. solver diagnostics / 収束診断
6. validation result / 入力診断
```

最初の実装候補としては、到達確率または勝率が最も扱いやすいです。

理由は、既存の状態遷移モデルを使いやすく、期待値とは別の成果軸を追加でき、GUIやセイカタンにも接続しやすいためです。

## Suggested PR sequence

```text
1. Merge the last boundary reinforcement PR.
2. Add this restart and diffusion guide.
3. Link this guide from README.
4. Add a small reachability/win-probability spec.
5. Implement the minimal forward calculation.
6. Add JSON/report boundary only after the production result shape is stable.
```

This document should be treated as a restart guide. It is not a replacement for detailed specifications, but it prevents the project from drifting back into endless micro-test additions.
