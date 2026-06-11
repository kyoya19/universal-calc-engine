# 成果還元関数 roadmap

この文書は、成果還元関数を外向けに説明するための段階的な整備順を固定します。

## Phase 1: naming and boundary

- 成果還元関数を正式名称として扱う
- 旧称の打技還元関数は廃止する
- キヨタンを順方向評価、セイカタンを逆方向推定として説明する
- code-level rename はまだ行わない

## Phase 2: documentation surface

- README から成果還元関数の説明へ到達できるようにする
- 観測・仮定・評価済み情報の分離を明記する
- 期待値・勝率・時給・判断根拠への還元を主目的として説明する

## Phase 3: implementation review

- 型名・関数名・ファイル名の変更候補を列挙する
- production numeric values と executable graph は変更しない
- runtime target substitution は別工程として扱う

## Phase 4: externalization

- 外向け説明では、成果還元関数を中核評価モデルとして扱う
- キヨタンとセイカタンは、その上に載る利用方向として整理する
- マネタイズ説明は実装境界と混同しない
