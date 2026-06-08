# Generated Target Solver Decision Matrix

## Purpose

This document opens the v0.6 planning boundary for generated-target solver integration.

v0.6 must decide target-selection behavior before any runtime solver integration uses `generatedTo`.

This document does not approve generated-target solver execution. It defines the decision matrix that must be resolved first.

## Current invariant inherited from v0.5

The current solver invariant remains:

```text
solver target = transition.to
```

The current accepted graph target policies remain:

- `explicit_only`,
- `diagnostics_only`.

Both select:

```text
edge.explicitTo
```

`generated_candidate_as_solver_target` remains unaccepted at runtime.

## Decision axes

A future generated-target solver policy must choose behavior across the following axes.

### 1. Missing generated target

A missing generated target means:

```text
edge.generatedTo === undefined
```

Possible decisions:

| Decision | Meaning | Solver safety |
| --- | --- | --- |
| `reject` | fail before solving | safest |
| `fallback_to_explicit` | use `edge.explicitTo` | compatible but may hide incomplete generation |
| `solver_error` | throw when encountered during solving | safe but later-failing |
| `allow_missing` | continue without a generated target requirement | not suitable for generated-target solver execution |

Initial recommendation:

```text
reject
```

Generated-target solver execution should not proceed when a required generated target is missing.

### 2. Explicit/generated mismatch

An explicit/generated mismatch means:

```text
edge.explicitTo !== edge.generatedTo
```

Possible decisions:

| Decision | Meaning | Solver safety |
| --- | --- | --- |
| `reject` | fail before solving | safest |
| `fallback_to_explicit` | keep current behavior | compatible but not generated-target execution |
| `use_generated` | select `edge.generatedTo` | semantic change |
| `solver_error` | throw when encountered during solving | safe but later-failing |

Initial recommendation:

```text
reject
```

A generated-target solver policy should not silently choose generated targets when explicit targets disagree unless a later PR explicitly documents the semantic change and updates expected values.

### 3. Explicit/generated match

An explicit/generated match means:

```text
edge.explicitTo === edge.generatedTo
```

Possible decisions:

| Decision | Meaning | Solver safety |
| --- | --- | --- |
| `use_explicit` | preserve existing solver behavior | safest |
| `use_generated` | use generated target after equality check | equivalent for matching edges |
| `require_match_then_use_generated` | reject non-matches, use generated for matches | candidate generated-target policy |

Initial recommendation:

```text
require_match_then_use_generated
```

This is the smallest meaningful generated-target solver candidate because it uses generated targets only after proving they match explicit definitions.

### 4. Expected value baseline

Possible decisions:

| Decision | Meaning |
| --- | --- |
| `must_remain_unchanged` | generated policy is accepted only if expected values stay identical |
| `may_change_with_dedicated_pr` | expected values may change only in a separate semantic-change PR |
| `may_change_in_same_pr` | generated integration may change expected values immediately |

Initial recommendation:

```text
must_remain_unchanged
```

The first generated-target solver policy should prove equivalence before any semantic change is allowed.

### 5. Contribution output

Possible decisions:

| Decision | Meaning |
| --- | --- |
| `report_explicit_target` | current behavior |
| `report_generated_target` | semantic/reporting change |
| `report_both_targets` | inspection-oriented output expansion |

Initial recommendation:

```text
report_explicit_target
```

Contribution output should not change in the first generated-target solver planning step.

## Candidate policy: `require_generated_match`

A safe first generated-target policy candidate is:

```text
require_generated_match
```

Behavior:

1. every solver edge must have `generatedTo`,
2. every `generatedTo` must equal `explicitTo`,
3. mismatch rejects the model before solving,
4. missing generated target rejects the model before solving,
5. matched generated targets may be used internally,
6. expected reward values must remain unchanged,
7. contribution output remains explicit-target based.

This policy proves generated-target integration without changing model semantics.

## Rejected first policies

The following should not be the first v0.6 runtime policy:

### `use_generated_with_fallback`

Reason:

- it hides incomplete generation,
- it mixes generated and explicit target semantics,
- it makes regression failures harder to interpret.

### `use_generated_on_mismatch`

Reason:

- it changes solver semantics,
- it may change expected values,
- it requires a dedicated semantic-change PR.

### `allow_missing_generated_targets`

Reason:

- it does not actually validate generated-target readiness,
- it preserves ambiguity around legacy transitions.

## Required regression tests before runtime integration

Before any generated-target solver runtime behavior is added, tests must cover:

1. all explicit/generated targets match,
2. one generated target is missing,
3. one explicit/generated target mismatches,
4. representative Sugoroku expected values remain unchanged,
5. contribution output remains explicit-target based,
6. diagnostics and graph summary still report mismatch data.

## v0.6 planning completion checklist

v0.6 planning is complete when:

1. this decision matrix exists,
2. the first generated-target solver policy candidate is selected,
3. missing generated target behavior is selected,
4. mismatch behavior is selected,
5. expected value behavior is selected,
6. contribution output behavior is selected,
7. runtime implementation remains outside the planning PR.

## Next safe PR

The next safe PR after this document should add type-level planning names only, without connecting them to `solveExpectedReward()` or `toContributionResult()`.

A runtime PR may follow only after tests are added for missing generated targets, mismatched generated targets, and unchanged representative expected values.
