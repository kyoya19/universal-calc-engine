# 成果還元関数 rename inventory

この文書は、成果還元関数への名称整理を実装へ進める前に確認する対象を棚卸しします。

## Current status

- 文書上の正式名称は成果還元関数です。
- 旧称の打技還元関数は廃止済みです。
- 現時点では、code-level rename は未実施です。

## Review targets before code rename

- public type names
- internal type names
- function names
- file names
- test names
- fixture names
- report labels
- README and docs links

## Non-targets for this stage

- production numeric values
- executable production graph
- runtime target substitution
- expected value assertions
- UI / TeX / CSS / Android native output

## Safe order

1. Keep documentation naming fixed.
2. List code-level candidates without changing behavior.
3. Rename internal-only symbols first.
4. Keep public API and report identity changes for a later boundary.
5. Run CI after each small PR.
