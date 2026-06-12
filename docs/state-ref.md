# State generation reference note

This note records the reference check for the state generation rename group.

## Scope

State generation types and helpers are reviewed here before any rename.

## References found

- `packages/core/src/state_generation.ts` defines the state generation types and helpers.
- `packages/core/src/index.ts` exports `./state_generation` through the package barrel.
- `packages/core/test/state_generation.test.ts` imports the helpers directly and fixes current behavior.

## Decision

This group is not internal-only yet.

No code-level rename is approved by this note.

A later rename PR must avoid mixing this group with report identity, serialized output identity, production numeric values, expected value assertions, executable graph changes, UI, TeX, CSS, Android output, or Sugoroku baseline behavior.
