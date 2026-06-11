# 成果還元関数 code rename candidates

この文書は、成果還元関数の名称整理をコードへ進める前に、候補だけを列挙します。

この段階では実装変更を行いません。

## Candidate categories

- model-facing type names
- solver-facing helper names
- report adapter names
- fixture names
- test names
- file names
- documentation anchors

## Review rules

- public API names are not changed first
- report identity is not changed in the same PR as internal names
- production values remain untouched
- runtime target substitution remains out of scope
- expected value assertions remain out of scope

## First safe implementation target

The first implementation rename should be limited to internal-only names that do not affect runtime behavior, serialized output, report identity, or public imports.

## Stop conditions

Stop the rename path before implementation if any candidate touches:

- executable graph shape
- source-backed numeric values
- UI output
- TeX output
- Android native output
- existing Sugoroku baseline behavior
