# Assistant autonomy

## Purpose

This document defines the assistant-side operating rules for low-risk GitHub work in this repository.

The goal is to avoid repeated user confirmation for routine changes while keeping repository safety, CI verification, and phase order visible.

## Current phase boundary

The current focus is Phase 0: assistant autonomy and GitHub workflow clarification.

Do not advance domain samples or reverse estimation while this phase is being fixed.

```text
Current order:
1. Assistant autonomy rules
2. README and docs entry cleanup
3. Sugoroku PoC v0.4 completion and boundary check
4. Generic model layer reinforcement
5. Solver target policy formalization
6. Output, report, TeX, and JSON boundary cleanup
7. Minimal Kiyotan forward engine
8. Minimal Seikatan reverse estimation
9. Representative samples such as digipachi and Juoh
```

## Low-risk autonomous work

The assistant may proceed without additional user confirmation when all of the following are true.

```text
- The change is small to medium sized.
- The change is on a work branch, not directly on main.
- The change does not alter public API meaning.
- The change does not change runtime solver target policy.
- The change does not add secrets, costs, license changes, or visibility changes.
- The change can be checked through Pull Request diff and CI.
- The change belongs to the current phase or an explicitly allowed next phase.
```

Examples of allowed low-risk work:

```text
- Documentation clarifying existing workflow rules.
- Tests that lock existing behavior.
- Small validation or diagnostics additions that do not change accepted semantics.
- README entry cleanup that improves phase visibility.
- Boundary notes that separate implemented behavior from future behavior.
```

## Standard autonomous sequence

Use this sequence for normal work.

```text
1. Check repository state, default branch, open PRs, and relevant open issues.
2. If an open PR exists, inspect its diff, CI status, and merge suitability first.
3. Do not reuse empty PRs, failed PR branches, or unclear branches.
4. Select the safest small to medium work unit in phase order.
5. Create a new branch from main.
6. Fetch target files before editing existing files.
7. Update existing files, or create a non-empty new file only when the new file is justified.
8. Open a Pull Request with purpose, changes, verification, and issue link.
9. Check CI for the PR head SHA.
10. Merge only after CI success, using expected_head_sha.
11. Confirm the merged result on main only to the extent needed.
12. Continue to the next safe work unit when no stop condition applies.
```

## Prohibited operations

Do not perform the following.

```text
- Delete the repository.
- Add secrets or private credentials.
- Change repository visibility or external publication settings.
- Change license terms.
- Trigger material paid services or high-cost operations.
- Write directly to main as normal development flow.
- Break public API compatibility.
- Change the meaning of existing behavior without a dedicated issue and PR.
- Perform large renames.
- Create noop commits.
- Create empty PRs.
- Create empty files.
- Repeat PR body-only updates.
- Repeat PR comment-only checks.
- Repeat the same failed operation without changing the cause.
- Force-move branches with update_ref.
- Use low-level create_tree or create_commit workflows for normal changes.
- Promote generatedTo into solver targets without a dedicated solver policy PR.
- Treat estimates as confirmed values.
- Expand digipachi, Juoh, or Seikatan before their phase.
```

## Conditional operations

Some operations are not banned. They are conditional.

```text
create_file:
- Allowed only on a work branch.
- Do not use on main.
- Use only for a justified non-empty new file.

update_file:
- Allowed for existing file replacement on a work branch.
- Fetch the file first and use the current blob sha.
- Do not use directly on main.

delete_file:
- Avoid in normal development.
- Use only for repair work such as removing accidental empty files.
- Fetch the target first and use the current blob sha.

fetch_commit_workflow_runs:
- Allowed for PR head SHA CI checks.
- Do not use for repeated main-status polling.

api_tool.list_resources:
- Allowed for tool schema checks.
- Do not repeat during routine work when the schema is already known.
```

## Stop conditions

Stop and report instead of continuing when any of the following applies.

```text
- Public API breakage cannot be avoided.
- Existing behavior meaning would change.
- generatedTo solver integration becomes necessary.
- Repository visibility, license, secrets, or cost-bearing actions are involved.
- CI fails and the cause is unclear.
- Further attempts would repeat the same failed operation.
- The only available path appears to be direct main writes.
- The next step would jump ahead to digipachi, Juoh, Seikatan, product UI, or monetization.
```

## Public repository re-evaluation

Past failures may have been affected by private repository access or quota restrictions.

Public visibility means some operations should be re-evaluated as conditional rather than treated as absolutely prohibited. This does not remove the branch, PR, CI, and expected-head merge requirements.

## Solver and domain boundaries

The current solver target policy remains explicit-only.

generatedTo is diagnostics-only at this phase. Moving generated targets into solver behavior requires a dedicated policy PR and baseline tests.

Digipachi and Juoh references are treated as boundary or representative samples, not as the current implementation phase.

Seikatan reverse estimation is outside the current phase.
