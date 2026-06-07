# operation_safety_log

## 目的

GitHub操作中にツール安全チェックで停止した場合、停止理由と次手を記録し、進められる作業を止めない。

## 現在の運用

低リスク作業では、ユーザーの追加確認を待たずに以下を進める。

```text
Issue
→ Branch
→ Create / Update
→ Pull Request
→ CI確認
→ merge可能ならmerge
```

## 停止時の扱い

ツール安全チェックで停止した場合は、該当PRまたはIssueへ以下を残す。

```text
ここは安全チェックで引っ掛かったため、該当操作を手動側へ回します。
状態:
- CI
- PR mergeability
- blocked operation
対応:
- 依存しない作業は続行
- 依存する作業はmerge後に再開
```

## PR #13

### 状態

```text
CI: success
PR: mergeable
blocked operation: merge_pull_request
```

### 対応

PR #13には停止コメントを残した。

PR #13に依存する作業は、PR #13 merge後に進める。

PR #13に依存しない文書・設計作業は続行する。

## 止める条件

```text
CI失敗で設計判断が必要
破壊的操作
公開設定・権限・ライセンス変更
秘密情報
外部費用
確定値・推定値・仮定値・不明値の混在
```
