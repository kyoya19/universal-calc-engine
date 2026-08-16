# Qualified scope status

## Current authoritative status

The current qualified Public analytical subject used by the current package generation is pinned to:

```text
subject: subject-public-8b341032516a
commit: 8b341032516a2f5108170743c4dafd8fde31a229
```

Current project control remains:

```text
CURRENT_SCOPE_QUALIFICATION_COMPLETE_WITH_CHANGE_CONTROL
QUALIFIED_SCOPE_HOLD
QUALIFIED_SCOPE_HOLD_WITH_EXTREP_STABLE_BLOCKED
globalHoldReleased=false
fullWaveRerunRequired=false
A=0
B=0
TRIGGER-02 not established
TRIGGER-05 not established
futureFoundationTesting=TRIGGER_DRIVEN_NOT_COMPLETENESS_SEEKING
```

This status means that qualification for the currently defined contract is complete at the present controlled scope and that future qualification work is trigger-driven rather than roadmap-driven.

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

Those historical Wave/Level records belong to the earlier completion sequence and remain immutable evidence. Later targeted qualifications added already-controlled finite capabilities without converting the project into completeness-seeking reruns.

The remaining historical Wave 1 / Wave 2 Gate limitations do not represent unresolved current-subject failures. They identify capabilities outside or beyond the corresponding qualified implementation boundary.

## Known scoped limitations

Historical limitation identifiers such as:

```text
SEI-404
KS-504
CMP-604
CMP-606
```

remain preserved in the records that established them. They must not be silently reclassified as bugs merely because a broader problem class remains unsupported.

Missing functionality outside a current qualified contract is treated as scope expansion, not as a defect in the qualified subject.

## Qualified capability summary

The current controlled scope includes, within the documented qualified contract boundaries:

- finite explicit probabilistic state-transition modeling;
- Kiyotan forward evaluation;
- expected reward, expected elapsed time, reachability, and ratio-of-expectations reward rate;
- named reward axes and descriptive transition contribution;
- paired descriptive scenario comparison and one-at-a-time sensitivity;
- finite acyclic decision evaluation / optimization within qualified contracts;
- cyclic forward evaluation within qualified contracts;
- first-class `ObservationDataset` separation;
- finite-candidate and finite-grid Seikatan inverse estimation for supported forms;
- ambiguity preservation for tied finite candidates/assignments;
- impossible-candidate handling and parameter reconstruction;
- forward/reverse closure for supported forms;
- predictive-equivalence and parameter-recovery distinctions;
- checked external JSON and versioned forward/reverse handoff;
- deterministic reproducibility;
- finite-horizon state-distribution and first-passage analysis;
- qualified finite-chain long-run behavior analysis;
- qualified finite hidden-state observation, filtering/smoothing, pairwise smoothing, and declared-evidence conditioning forms;
- qualified finite hidden-state parameter re-estimation forms, including bounded iterative forms with explicit convergence/stop status where documented;
- qualified finite additive trajectory-functional distribution and conditioning forms, including declared calibrated evidence;
- qualified ambiguity-preserving finite trajectory decoding / decision compositions where documented;
- the qualified finite maintenance-decision-support workflow;
- the current Closed-Loop Foundation Showcase composition of already-qualified APIs.

The package/root export surface is broader than the recommended generic checked facade. An exported identifier does not by itself authorize claims beyond the capability contract that qualified it.

See:

- [Current-generation consumer quickstart](current-generation-consumer-quickstart.md)
- [v1 completion boundary](v1-completion-boundary.md)
- [v1 support matrix and handoff map](forward-v1-support-matrix.md)
- [Closed-Loop Foundation technical provenance](showcase/closed-loop-foundation.md)

## Important semantic boundaries

The qualified status does not change the following semantics:

- scenario comparison is descriptive, not automatically causal;
- one-at-a-time sensitivity is not unique factor attribution;
- transition contribution is descriptive decomposition, not automatically causal or Shapley attribution;
- finite-family or finite-grid ties do not prove global structural non-identifiability;
- finite-candidate/grid inference is not continuous inference;
- likelihood ratio is not posterior probability;
- tied candidates/assignments must not be collapsed into an arbitrary point estimate;
- predictive equivalence in one scenario does not guarantee equivalence in another;
- a predefined scenario is not an optimized policy;
- objective-specific ranking is not an objective-free optimum;
- bounded non-convergence must remain visible and must not be rewritten as convergence;
- finite hidden-state capability does not imply unrestricted latent-variable inference over arbitrary model classes.

## Showcase evidence and current Closed-Loop Showcase

Historical promoted Showcase evidence records remain preserved under the exact subjects against which they were qualified. They are not rewritten to appear as evidence for a later analytical subject.

The current Closed-Loop Foundation Showcase is separately tied to:

```text
subject-public-8b341032516a
8b341032516a2f5108170743c4dafd8fde31a229
```

Its current npm distribution gap is closed by verified `universal-calc-engine@1.1.0` distribution. That distribution fact does not alter the Showcase expected-result commitment or expand analytical scope.

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
