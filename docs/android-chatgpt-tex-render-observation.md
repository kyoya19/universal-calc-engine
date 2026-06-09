# Android ChatGPT TeX Render Observation

## Purpose

This document records the Android ChatGPT rendering observation for the v0.7 value-function display path.

The observation is based on an Android ChatGPT screen check where code-block-free TeX display math was rendered as formatted math.

## Observed result

The following display-math rows were shown as rendered math on Android ChatGPT:

```text
V(position_0) = 2.25
V(position_1) = 1.5
V(position_2) = 1
V(position_3) = 0
```

The raw delimiters and commands, such as `\[` and `\mathrm`, were not shown in the rendered math rows.

## Display policy update

For Android-oriented value-function display:

- rendered TeX can be used as the primary visual display when the host supports TeX rendering,
- `plainText` remains the required fallback and accessibility-friendly display value,
- row-level TeX should be preferred over one long raw TeX block,
- each value-function row should remain independently renderable,
- the start state should remain first and should not be duplicated.

## CSS boundary

CSS does not apply to ChatGPT message rendering itself.

CSS guidance remains relevant for downstream web / app UI layers that consume `className` from `outputResultToValueFunctionDisplayRows()`.

Therefore, the rendering concerns are separated as follows:

- ChatGPT message rendering: verify TeX renderability through actual Android display output,
- downstream UI rendering: apply CSS using the row-level class names,
- core package: provide row-level `plainText`, `tex`, `className`, and metadata without embedding CSS.

## Preserved invariants

This observation does not change:

- solver target,
- contribution target,
- generated-target runtime policy,
- expected reward baseline,
- generated-target diagnostic-only boundary.

The representative baseline remains:

```text
V(position=3) = 0
V(position=2) = 1
V(position=1) = 1.5
V(position=0) = 2.25
```
