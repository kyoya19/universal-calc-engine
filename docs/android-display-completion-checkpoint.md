# Android Display Completion Checkpoint

## Purpose

This checkpoint records the completed v0.7 Android-oriented value-function display boundary after PR #80, PR #81, and PR #82.

The checkpoint closes the Android TeX display observation loop before moving from reporting / diagnostic UX work toward the v0.8 UI-consumable report model.

## Completed scope

The v0.7 Android display path now includes:

- Android-oriented row-level value-function display data,
- compact row-level TeX fragments,
- plain-text fallback strings,
- start-state metadata,
- CSS class metadata for downstream UI layers,
- guidance that keeps CSS outside `packages/core`,
- Android ChatGPT observation that code-block-free display TeX renders as formatted math.

## Source API

Use `outputResultToValueFunctionDisplayRows()` for Android-oriented value-function display.

Each row includes:

- `stateId`,
- `value`,
- `plainText`,
- `tex`,
- `className`,
- `isStartState`.

The row model is intended for narrow display consumers and for UI layers that need stable display metadata without parsing a long TeX block.

## Android display policy

Android display should treat rendered TeX as the primary visual path when the host supports TeX rendering.

`plainText` remains required for:

- fallback display,
- accessibility-friendly rendering,
- copy / paste handling,
- diagnostics that should not depend on math rendering support.

Row-level TeX remains preferred over a single `aligned` block for Android-facing display because each expression can be rendered, wrapped, copied, or replaced independently.

## CSS boundary

CSS remains outside `packages/core`.

The core package provides `className` metadata only. Downstream web / app UI layers may use those class names for narrow-screen styling, but ChatGPT message rendering itself is verified by actual TeX rendering behavior rather than by CSS.

The current class names are:

```text
value-function-row
value-function-row value-function-row--start
```

## Verified Android observation

On Android ChatGPT, code-block-free display math was observed to render as formatted math for the representative value-function rows:

```text
V(position_0) = 2.25
V(position_1) = 1.5
V(position_2) = 1
V(position_3) = 0
```

The raw delimiters and commands, including `\[` and `\mathrm`, were not shown in the rendered rows.

## Preserved invariants

This checkpoint does not change runtime semantics.

The following remain fixed:

- solver target is `transition.to`,
- contribution target is `transition.to`,
- `generatedTo` is validation / diagnostics / summary / comparison report data only,
- `generatedTo` is not used as solver target,
- `generatedTo` is not used as contribution target,
- runtime target substitution remains unimplemented and out of scope,
- `generated_candidate_as_solver_target` remains rejected as runtime policy,
- expected reward baseline remains unchanged.

The representative expected reward baseline remains:

```text
V(position=3) = 0
V(position=2) = 1
V(position=1) = 1.5
V(position=0) = 2.25
```

For Android display order, the start state remains first and is not duplicated:

```text
V(position_0) = 2.25
V(position_1) = 1.5
V(position_2) = 1
V(position_3) = 0
```

## Completion boundary

The v0.7 Android display work is complete when:

- row-level display data exists,
- row order and start-state de-duplication are covered by tests,
- compact row-level TeX avoids raw multi-line `aligned` wrappers,
- CSS guidance is documented as downstream-only,
- Android ChatGPT TeX renderability is recorded,
- generated-target runtime substitution remains out of scope.

This checkpoint satisfies that boundary.

## Next boundary

The next safe step is v0.8 UI-consumable report model work.

That work may add report-model structures for UI consumption, but it must not connect `generatedTo` to solver or contribution execution paths.