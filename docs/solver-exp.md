# Solver explicit policy

Solver targets remain explicit-only. Generated targets stay in diagnostics and planning checks.

Public entrypoint rejection coverage is fixed in `packages/core/test/generated_target_solver_policy.test.ts`.

Runtime expected reward and contribution output continue to use explicit targets while generated targets remain planning-boundary evidence.

The Sugoroku v0.4 completion checklist mirrors this boundary in `docs/sugoroku-poc-v0.4-boundary.md`.

Any runtime target policy change must start from a dedicated policy PR before solver behavior changes.

This note does not approve generated-target solver integration or runtime target policy changes.
