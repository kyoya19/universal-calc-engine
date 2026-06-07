# GitHub workflow

## 結論

本プロジェクトは、GitHubのIssue、Branch、Pull Request、Actionsを使って淡々と進める。

## 標準手順

```text
1. Issueを作る
2. Issueに目的・完了条件を書く
3. 作業ブランチを作る
4. 小さくcommitする
5. Pull Requestを作る
6. GitHub Actionsでtypecheck/testを確認する
7. 差分を確認する
8. mainへmergeする
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
```

## Actionsの役割

CIでは、最低限以下を実行する。

```text
npm run typecheck
npm test
```

## 本プロジェクト固有の順序

```text
1. サイコロPoC v0.3を通す
2. 汎用モデル層を少しずつ拡張する
3. OutputResultとContributionResultを分離したまま保つ
4. 四号機獣王PoCを公開解析値整合モデルとして追加する
5. キヨタン順方向検証を行う
6. セイカタン最小逆方向推定を行う
7. 往復評価へ進む
```

## 禁止

```text
main直書きを通常運用にする
Issueなしで大きな仕様変更を入れる
サイコロPoC前に獣王・セイカタンへ進む
推定値を確定値として扱う
```
