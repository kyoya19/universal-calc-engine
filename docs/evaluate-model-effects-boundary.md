# Evaluate model effects boundary

PR #755 fixed the evaluated transition boundary for `effects[]`.

`evaluateModel()` preserves transition `effects[]` on evaluated transitions while keeping `transition.to` as the explicit target. This keeps effects available for state generation and diagnostics without rewriting solver-facing targets.
