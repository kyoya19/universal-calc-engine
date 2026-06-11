# 成果還元関数 core model reference note

この文書は、成果還元関数のcode-level rename前に、core model group の参照確認結果を記録します。

この段階ではコードを書き換えません。

## Search result status

GitHub code search for core identifiers did not return reliable results in this session.

Therefore, this note relies on direct file inspection of `packages/core/src/model.ts` and previously recorded identifier map entries.

## Directly inspected file

- `packages/core/src/model.ts`

## Confirmed core model identifiers

| Identifier | Current file | Current role | Rename decision |
| --- | --- | --- | --- |
| `StateId` | `packages/core/src/model.ts` | state identifier alias | do not rename yet |
| `PropertyValue` | `packages/core/src/model.ts` | state property scalar alias | do not rename yet |
| `StateProperties` | `packages/core/src/model.ts` | state property map | do not rename yet |
| `ScalarSpec` | `packages/core/src/model.ts` | numeric specification input | do not rename yet |
| `ProbabilitySpec` | `packages/core/src/model.ts` | probability input alias | do not rename yet |
| `RewardSpec` | `packages/core/src/model.ts` | reward input alias | do not rename yet |
| `TerminalCondition` | `packages/core/src/model.ts` | terminal condition input | do not rename yet |
| `TransitionEffect` | `packages/core/src/model.ts` | transition effect input | do not rename yet |
| `StateDefinition` | `packages/core/src/model.ts` | state definition shape | do not rename yet |
| `TransitionDefinition` | `packages/core/src/model.ts` | transition definition shape | do not rename yet |
| `EvaluatedTransition` | `packages/core/src/model.ts` | evaluated transition shape | do not rename yet |
| `DefinitionModel` | `packages/core/src/model.ts` | source model shape | do not rename yet |
| `ExpandedModel` | `packages/core/src/model.ts` | expanded model shape | do not rename yet |
| `EvaluatedModel` | `packages/core/src/model.ts` | evaluated model shape | do not rename yet |
| `SolvedModel` | `packages/core/src/model.ts` | solved model shape | do not rename yet |
| `OutputResult` | `packages/core/src/model.ts` | output-facing result | do not rename yet |
| `ContributionResult` | `packages/core/src/model.ts` | contribution-facing result | do not rename yet |

## Confirmed core model functions

| Identifier | Current file | Current role | Rename decision |
| --- | --- | --- | --- |
| `evaluateScalarSpec` | `packages/core/src/model.ts` | scalar evaluation helper | do not rename yet |
| `applyTransitionEffects` | `packages/core/src/model.ts` | effect application helper | do not rename yet |
| `isTerminalState` | `packages/core/src/model.ts` | terminal state predicate | do not rename yet |
| `expandModel` | `packages/core/src/model.ts` | definition to expanded model | do not rename yet |
| `evaluateModel` | `packages/core/src/model.ts` | expanded to evaluated model | do not rename yet |
| `solveExpectedReward` | `packages/core/src/model.ts` | expected reward solver | do not rename yet |
| `toOutputResult` | `packages/core/src/model.ts` | output result conversion | do not rename yet |
| `toContributionResult` | `packages/core/src/model.ts` | contribution result conversion | do not rename yet |

## Boundary

The core model group remains public-surface and behavior-facing.

No rename is approved from this note.

## Next safe step

The next safe step is to record reference notes for state generation, generated-target solver, and report model groups separately.
