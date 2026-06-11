# 成果還元関数 rename checkpoint

このcheckpointは、成果還元関数への名称整理が文書面でどこまで完了したかを固定します。

## Completed

- 成果還元関数の定義を追加した
- 旧称の打技還元関数を廃止した
- キヨタンを順方向評価として整理した
- セイカタンを逆方向推定として整理した
- README から成果還元関数関連docsへ到達できるようにした
- 外向けbriefを追加した
- 実装リネーム前の棚卸しを追加した
- code rename candidates を追加した

## Still out of scope

- code-level type rename
- function rename
- file rename
- report identity change
- executable production graph
- runtime target substitution
- production numeric values
- expected value assertions
- UI / TeX / CSS / Android native output

## Next safe step

次の安全な工程は、code rename candidates を実リポジトリ内の現行識別子へ照合することです。

ただし、照合段階ではまだコードを書き換えません。
