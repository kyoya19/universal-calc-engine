# GitHub workflow

## 結論

本プロジェクトは、GitHubのIssue、Branch、Pull Request、Actionsを使って淡々と進める。

自律進行の詳細ルールは `docs/assistant_autonomy.md` に置く。このファイルは、通常のGitHub作業手順とフェーズ順を定義する。

## 標準手順

```text
1. Issueを作る、または既存Issueを確認する
2. Issueに目的・対象外・完了条件・検証方法を書く
3. mainとopen PRを確認する
4. 作業ブランチをmainから作る
5. 対象ファイルをfetchしてshaと内容を確認する
6. 作業ブランチへ小さく変更する
7. Pull Requestを作る
8. GitHub Actionsでtypecheck/testを確認する
9. 差分を確認する
10. CI success後、expected_head_shaを指定してmainへmergeする
```

## Issueの役割

Issueは、やることの置き場ではなく、判断と完了条件の記録である。

最低限、以下を書く。

```text
目的
対象外
完了条件
検証方法
```

## PRの役割

PRは、変更差分と検証結果の単位である。

PR本文には以下を書く。

```text
目的
変更内容
検証方法
次に進む条件
関連Issue
```

## Actionsの役割

CIでは、最低限以下を実行する。

```text
npm run typecheck
npm test
```

## 本プロジェクト固有の順序

```text
1. 自律進行ルールを固定する
2. README / docs入口を整理する
3. すごろくPoC v0.4の完了状態と境界を確認する
4. 汎用モデル層を補強する
5. solver target policyを正式化する
6. Output / Report / TeX / JSON境界を整理する
7. キヨタン最小順方向エンジンをまとめる
8. セイカタン最小逆方向推定を扱う
9. デジパチ・獣王などを代表サンプルへ昇格する
```

## 現在の境界

```text
solver targetはtransition.toのexplicit-onlyを維持する
generatedToはdiagnostics-onlyとする
generatedToをsolver targetに使う変更は専用policy PRまで行わない
reverse estimation / Seikatan behaviorは現在フェーズ外とする
product UI / monetizationは現在フェーズ外とする
```

## 禁止

```text
main直書きを通常運用にする
Issueなしで大きな仕様変更を入れる
public APIを破壊する
既存仕様の意味を変える
大規模renameを行う
空PR・noop commit・空ファイルを作る
PR本文更新だけを反復する
PRコメント確認だけを反復する
失敗した同一操作を連打する
サイコロPoC / すごろくPoC境界確認前に獣王・セイカタンへ進む
generatedToをいきなりsolver targetにする
推定値を確定値として扱う
```
