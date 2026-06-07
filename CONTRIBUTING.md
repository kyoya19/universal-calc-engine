# CONTRIBUTING

## 結論

このリポジトリでは、main直書きを通常運用にしない。

作業は以下の順序で進める。

```text
Issue
→ Branch
→ Commit
→ Pull Request
→ GitHub Actions
→ Merge
```

## 作業単位

Issueは、判断単位・実装単位・検証単位が追える大きさにする。

PRは、1つのIssueに対応させることを基本とする。

## ブランチ名

```text
feature/<短い機能名>
fix/<短い修正名>
chore/<作業名>
docs/<文書名>
```

例：

```text
feature/dice-poc
chore/github-workflow
docs/project-scope
```

## merge条件

- CIが通っている
- 目的がPR本文に書かれている
- known / estimated / assumed / unknown を混ぜていない
- サイコロPoCが通る前に獣王・セイカタンへ進んでいない

## 判断不要時の進め方

ユーザー判断が不要な場合は、もっとも保守的で検証しやすい単位に分けて進める。

仕様変更・命名変更・スコープ変更はIssueに残す。
