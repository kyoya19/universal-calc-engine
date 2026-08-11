# Qualified scope status

## Current authoritative status

The current qualified Public subject is pinned to:

```text
subject: subject-public-1df6235d58a5
commit: 1df6235d58a5027fdae0390f7a73a09cfb4ee1ee
```

The project-level completion authority for this subject records:

```text
CURRENT_SCOPE_QUALIFICATION_COMPLETE_WITH_CHANGE_CONTROL
operating mode: QUALIFIED_SCOPE_HOLD
current subject failures: 0
current Public fix candidates: 0
```

This status means that principal internal qualification for the currently defined functional contract is complete and that future qualification work is trigger-driven rather than roadmap-driven.

It does not mean that every possible state-transition, inverse-estimation, optimization, causal, Bayesian, or real-world prediction problem is solved.

## Qualification history

The historical Gate results are preserved as executed; failed Gates are not rewritten for presentation purposes.

| Qualification | Gate | Status |
|---|---|---|
| Wave 1 | Gate K-v1 | PASS |
| Wave 1 | Gate S-v1 | FAIL |
| Wave 1 | Gate KS-v1 | FAIL |
| Wave 1 | Gate R-v1 | EXECUTION_COMPLETE_WITH_CLASSIFICATION |
| Wave 2 | Gate L6-v1 | EXECUTION_COMPLETE_WITH_CLASSIFIED_LIMITATIONS |
| Wave 3 | Gate SEM-v1 | PASS |
| Wave 3 | PRE-L8-v1 | PASS |
| Level 8 | Gate L8-v1 | PASS |

The remaining Wave 1 / Wave 2 Gate limitations do not represent unresolved current-subject failures. They identify capabilities outside or beyond the qualified Public implementation boundary.

## Known scoped limitations

The following limitations remain intentionally classified as scope boundaries:

```text
SEI-404
KS-504
CMP-604
CMP-606
```

They must not be silently reclassified as bugs merely because they remain unsupported.

Missing functionality outside the current contract is treated as scope expansion, not as a defect in the qualified subject.

## Qualified capability summary

The qualified scope includes, within the documented v1 contract boundaries:

- finite explicit probabilistic state-transition modeling;
- Kiyotan forward evaluation;
- expected reward, expected elapsed time, reachability, and ratio-of-expectations reward rate;
- named reward axes and descriptive transition contribution;
- paired descriptive scenario comparison and one-at-a-time sensitivity;
- finite acyclic decision evaluation / optimization within the current contract;
- cyclic forward evaluation within the current contract;
- first-class `ObservationDataset` separation;
- finite-candidate and finite-grid Seikatan inverse estimation for supported forms;
- ambiguity preservation for tied finite-grid assignments;
- impossible-candidate handling and parameter reconstruction;
- forward/reverse closure for supported forms;
- predictive-equivalence and parameter-recovery distinctions;
- checked external JSON and versioned forward/reverse handoff;
- deterministic reproducibility;
- the qualified Level 8 finite maintenance-decision-support workflow.

See the existing completion and support documents for API-level detail:

- [v1 completion boundary](v1-completion-boundary.md)
- [v1 support matrix and handoff map](forward-v1-support-matrix.md)

## Important semantic boundaries

The qualified status does not change the following semantics:

- scenario comparison is descriptive, not automatically causal;
- one-at-a-time sensitivity is not unique factor attribution;
- transition contribution is descriptive decomposition, not automatically causal or Shapley attribution;
- finite-grid ties do not prove global structural non-identifiability;
- finite-candidate inference is not continuous inference;
- likelihood ratio is not posterior probability;
- tied assignments must not be collapsed into an arbitrary point estimate;
- predictive equivalence in one scenario does not guarantee equivalence in another;
- a predefined scenario is not an optimized policy;
- objective-specific ranking is not an objective-free optimum.

## Promoted Showcase evidence

Three evidence records have passed the project promotion criteria:

```text
SHOWCASE-WAVE2-CMP605-v1
SHOWCASE-WAVE1-KS503-v1
SHOWCASE-LEVEL8-MAINTENANCE-v1
```

Their promotion does not authorize a separate Showcase repository and does not expand the Public functional contract.

## Change control

The current qualified subject remains pinned until a concrete reopen trigger exists. Typical qualifying triggers include:

- a Public production-semantics change;
- an independently reproduced current-contract defect;
- a new application requirement outside the qualified scope;
- an external falsifiable counterexample or mathematical objection;
- a justified generalized capability proposal;
- a real-world calibration / validation specification;
- a broader external or Public claim that exceeds the current qualified scope.

By contrast, elapsed time, a new discussion thread, dependency-only or docs-only changes, formatting changes, a desire for more tests, a higher Level number, or the continued existence of known limitations do not by themselves reopen qualification.

## Reproducibility and maintenance position

The qualified subject remains the reference point for current-scope claims. Documentation, provenance, CI/security/dependency infrastructure, targeted regression validation after relevant production changes, and evidence maintenance may continue without inventing a new qualification campaign.

Any future production-semantics change must be evaluated against the affected qualified capability and, when required, followed by targeted requalification rather than an automatic full rerun of every historical Wave.
