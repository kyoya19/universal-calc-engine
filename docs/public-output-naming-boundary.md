# Public output naming boundary

This document defines the naming boundary for public-facing outputs before any code-level rename.

## Purpose

The project needs international technical names without losing the existing Japanese planning language and codenames. Public outputs should therefore expose stable technical terms while keeping Japanese names and codenames as aliases.

## Public-facing name layers

| Public output concept | International technical name | Japanese name | Codename |
| --- | --- | --- | --- |
| Outcome attribution model | Outcome Return Function | 成果還元関数 | - |
| Forward calculation engine | Forward Outcome Engine | 順方向成果計算エンジン | Kiyotan |
| Reverse estimation engine | Inverse Outcome Estimator | 逆方向成果推定エンジン | Seikatan |

## Current output boundary

Existing TypeScript model names remain unchanged for now:

- `DefinitionModel`
- `ExpandedModel`
- `EvaluatedModel`
- `SolvedModel`
- `OutputResult`
- `ContributionResult`

These names are still acceptable as internal structural names. They should not be replaced until the solver target policy and public output shape are stable.

## Recommended public wording

Use this wording in public docs before code-level rename:

- The project implements an Outcome Return Function foundation.
- Kiyotan is the codename for the Forward Outcome Engine.
- Seikatan is the codename for the Inverse Outcome Estimator.
- Current implementation work is still focused on Kiyotan-side explicit-only solver execution, graph diagnostics, and contribution output boundaries.

## Non-goals

Do not rename exported APIs, file paths, or existing tests in the same step as public wording alignment.

Do not introduce Seikatan implementation work until the forward output boundary is stable.
