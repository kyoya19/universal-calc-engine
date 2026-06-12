# Identifier rename readiness

This note prepares the identifier rename work without changing runtime behavior.

## Purpose

The goal is to separate rename readiness from actual code-level rename execution.

## Ready to inspect

- public type names
- internal helper names
- report-facing labels
- documentation-only references
- test fixture names

## Not ready to change in this note

- code-level type rename
- function rename
- file rename
- report identity change
- runtime target substitution
- production numeric values
- expected value assertions
- executable production graph
- UI / TeX / CSS / Android native output
- Sugoroku baseline behavior

## Review rule

Any later rename PR should stay narrow and should not mix documentation, runtime behavior, and test expectation updates in one change.
