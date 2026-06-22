# Number text entrypoint

`formatNumberPlainText` and `formatNumberDiagnosticText` are exported from `packages/core/src/index.ts`.

The current boundary records plain text formatting behavior for numeric inputs, including zero, signed numbers, and decimal numbers.

`formatNumberDiagnosticText` also preserves diagnostic spellings for `NaN`, `Infinity`, and `-Infinity` without changing model evaluation, solver behavior, reporting, or rename policy.
