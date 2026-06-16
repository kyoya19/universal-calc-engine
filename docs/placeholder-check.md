# Branch-first recovery note

This file records the recovery boundary for a direct-write mistake.

Repository changes should be made on a branch first, then reviewed through a pull request before merging into `main`.

The solver target policy remains explicit-only. Generated targets remain limited to diagnostics and planning boundaries until public output behavior is fixed by tests.

This note is documentation-only and does not change runtime behavior, public APIs, or naming policy.
