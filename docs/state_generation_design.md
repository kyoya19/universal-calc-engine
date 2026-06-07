# state_generation_design

## 結論

状態空間自動生成は、現時点では実装しない。

まず、`TransitionEffect[]` を使って、明示された現在状態から次状態候補を作る設計だけを固定する。

## 目的

既存の `to` による明示遷移を維持しつつ、将来的に以下を扱えるようにする。

```text
現在状態
+ transition.effects[]
→ 次状態候補
→ 状態ID生成
→ 重複状態統合
→ 遷移表生成
→ solver
```

## 現在の確定仕様

### known

- 既存solverは `transition.to` を使う。
- `effects[]` は評価後transitionに保持される。
- `applyTransitionEffects()` は、元propertiesを破壊せず、次propertiesを返す。
- 現在実装済みeffectは `set_property` のみ。

### estimated

なし。

### assumed

- 初回の状態生成では、状態IDはpropertiesから決定的に生成する。
- propertiesのkeyは辞書順で安定化する。
- 同じpropertiesを持つ状態は同一状態として統合する。

### unknown

- 式評価付きeffectの形式。
- 外部パラメータ参照の形式。
- 状態IDの最終命名規則。
- 近似・丸めを含む状態統合規則。
- セイカタンが推定した状態変数の扱い。

## 既存の明示to遷移との関係

当面は `to` を正とする。

`effects[]` は以下の役割に限定する。

```text
1. 次状態候補の検証
2. 状態properties更新の記録
3. 将来の自動状態生成への橋渡し
```

つまり、現段階では以下のように扱う。

```text
solver: transition.to を使う
state generation helper: transition.effects[] を使う
```

## 最小アルゴリズム案

```text
function generateNextState(currentState, transition): StateCandidate
  currentProperties = currentState.properties
  nextProperties = applyTransitionEffects(currentProperties, transition.effects)
  nextId = stateIdFromProperties(nextProperties)
  return { id: nextId, properties: nextProperties }
```

## 状態ID生成案

初期案は以下。

```text
state:{key1=value1,key2=value2,...}
```

例：

```text
{ position: 2, last_roll: 2 }
→ state:{last_roll=2,position=2}
```

## 重複統合案

```text
同じ正規化properties文字列を持つStateCandidateは同一状態として統合する。
```

## まだ実装しない理由

状態空間自動生成を早く入れすぎると、以下が混ざる。

```text
- 状態ID規則
- effects評価
- 式評価
- 状態統合
- solver
```

そのため、次の実装ステップは以下に限定する。

```text
1. stateIdFromProperties()
2. generateNextStateCandidate()
3. tests only
```

solver統合はその後に行う。

## 次の実装候補

```text
packages/core/src/state_generation.ts
packages/core/test/state_generation.test.ts
```

## 完了条件

- 明示to遷移は壊さない。
- effects[] から次propertiesを作れる。
- propertiesから決定的な状態IDを作れる。
- 同じpropertiesなら同じIDになる。
- solverにはまだ接続しない。
