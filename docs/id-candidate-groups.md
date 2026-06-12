# ID candidate groups

This note groups rename candidates before any code-level rename.

## Purpose

The goal is to inspect names in small groups instead of changing many identifiers at once.

## Groups

### Public surface

- exported types
- exported helpers
- report-facing labels

### Internal helpers

- local helper functions
- fixture builders
- test-only utilities

### Documentation references

- README links
- planning notes
- checkpoint notes

### Deferred areas

- runtime behavior
- production numeric values
- expected value assertions
- executable production graph
- UI / TeX / CSS / Android native output
- Sugoroku baseline behavior

## Rule

Any later rename PR should pick one group only and should not mix runtime changes with naming cleanup.
