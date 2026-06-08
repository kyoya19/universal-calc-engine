# Sugoroku PoC v0.6 Planning Completion Checklist

## Purpose

This document records the v0.6 planning completion boundary for generated-target solver integration.

The v0.6 planning phase selects the first generated-target solver candidate and locks the safety decisions that must hold before runtime solver integration can be attempted.

This document does not approve runtime generated-target solver execution.

## Selected planning candidate

The selected planning candidate is:

```text
require_generated_match
```

This candidate means generated targets may become solver candidates only after every solver edge proves that the generated target exists and matches the explicit target.

## Fixed decisions

| Axis | Decision | Status |
| --- | --- | --- |
| Missing generated target | `reject` | fixed for planning |
| Explicit/generated mismatch | `reject` | fixed for planning |
| Explicit/generated match | `require_match_then_use_generated` | selected candidate |
| Expected reward baseline | `must_remain_unchanged` | fixed for planning |
| Contribution output | `report_explicit_target` | fixed for planning |

## Runtime boundary

The current runtime invariant remains:

```text
solver target = transition.to
```

The following remain outside this planning completion step:

- connecting `generatedTo` to `solveExpectedReward()`,
- changing contribution output target reporting,
- allowing generated targets to override explicit targets,
- accepting missing generated targets,
- accepting explicit/generated mismatches,
- changing representative expected reward values.

## Regression coverage required before runtime integration

The planning boundary is covered when tests prove:

1. all explicit/generated targets match,
2. a missing generated target is rejected before solver runtime integration,
3. an explicit/generated mismatch is rejected before solver runtime integration,
4. the representative Sugoroku expected reward baseline remains unchanged,
5. contribution output remains explicit-target based.

## Representative expected reward baseline

The representative Sugoroku expected reward baseline remains:

```text
start: 2.25
position 1: 1.5
position 2: 1
position 3: 0
```

These values must remain unchanged for the first generated-target solver candidate.

## Completion criteria

v0.6 planning is complete when:

1. the decision matrix exists,
2. the type-level planning names exist,
3. the `require_generated_match` planning decision is represented in code,
4. missing generated target rejection is covered by regression tests,
5. explicit/generated mismatch rejection is covered by regression tests,
6. representative expected reward baseline invariance is covered by regression tests,
7. contribution output invariance is covered by regression tests,
8. runtime solver integration remains unimplemented.

## Next boundary after v0.6 planning

The next safe boundary after this checklist is not direct runtime connection.

The next safe boundary is a runtime design PR that documents the exact adapter point between generated-target validation and solver execution, while preserving:

```text
solver target = transition.to
```

A later runtime PR may connect generated target selection only after the adapter boundary is documented and reviewed separately.
