# Android TeX Display CSS Guidance

## Purpose

This document records the recommended CSS boundary for Android-oriented value-function display rows.

The core package returns display metadata only. It does not embed CSS rules, browser layout assumptions, or Android-specific UI components.

## Source API

Use `outputResultToValueFunctionDisplayRows()` from `packages/core`.

Each row includes:

- `plainText`,
- compact row-level `tex`,
- `className`,
- `isStartState`,
- `stateId`,
- `value`.

The current CSS class names are:

```text
value-function-row
value-function-row value-function-row--start
```

## Recommended narrow-screen HTML shape

Prefer one row per value-function result.

```html
<div class="value-function-list" aria-label="Value function rows">
  <div class="value-function-row value-function-row--start">
    <span class="value-function-row__plain">V(position_0) = 2.25</span>
    <code class="value-function-row__tex">V(\mathrm{position\_0}) &amp;= 2.25</code>
  </div>
  <div class="value-function-row">
    <span class="value-function-row__plain">V(position_1) = 1.5</span>
    <code class="value-function-row__tex">V(\mathrm{position\_1}) &amp;= 1.5</code>
  </div>
</div>
```

## Recommended CSS

```css
.value-function-list {
  display: grid;
  gap: 0.5rem;
  max-width: 100%;
}

.value-function-row {
  display: grid;
  gap: 0.25rem;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.value-function-row--start {
  font-weight: 700;
}

.value-function-row__plain,
.value-function-row__tex {
  min-width: 0;
  max-width: 100%;
}

.value-function-row__tex {
  display: block;
  overflow-x: auto;
  white-space: pre;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875em;
}
```

## Rationale

The Android display problem was caused by long raw TeX blocks being rendered as one dense unit on narrow screens.

The row-based API and CSS boundary address that by:

- keeping each value-function expression as an independent row,
- preserving a plain-text fallback,
- keeping TeX available as a compact diagnostic/export fragment,
- allowing horizontal scroll only inside the TeX fragment,
- avoiding duplicate start-state display,
- leaving final UI styling to the application layer.

## Out of scope

This document does not add:

- CSS files to `packages/core`,
- React / Android / web components,
- rendered MathJax or KaTeX output,
- runtime solver target changes,
- contribution target changes,
- generated-target runtime substitution.
