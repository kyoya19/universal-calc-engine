# Promoted Showcase guide

This page summarizes the three Showcase evidence records already promoted under the project's qualification criteria.

It does not create new Showcase candidates, authorize a separate Showcase repository, or expand the Public functional contract.

All three records are tied to the exact qualified Public subject:

```text
subject-public-1df6235d58a5
1df6235d58a5027fdae0390f7a73a09cfb4ee1ee
```

## SHOWCASE-WAVE2-CMP605-v1

### What it demonstrates

A nontrivial finite workflow combining supported forward and reverse capabilities:

```text
finite probabilistic model
→ forward reward / time / rate / reachability
→ observed evidence
→ finite two-parameter inverse search
→ parameter reconstruction
→ forward verification
```

The promoted evidence includes independent-oracle agreement, differential checks, metamorphic checks, and mutation detection within the qualified contract.

### What may be claimed

- finite-grid multi-parameter inverse estimation is supported for the qualified forms;
- recovered assignments can be reconstructed into the model and evaluated forward;
- the forward and reverse paths can be used together without silently changing their mathematical semantics.

### What may not be claimed

This Showcase does not establish:

```text
arbitrary continuous inverse estimation
latent-state inference
Bayesian posterior inference
causal attribution
arbitrary cyclic decision optimization
```

## SHOWCASE-WAVE1-KS503-v1

### What it demonstrates

An ambiguity-preserving Kiyotan–Seikatan workflow in which more than one supplied finite-grid assignment can fit the baseline evidence equally well.

The important behavior is not merely finding a best assignment. It is preserving the tied set and propagating that ambiguity when the assignments are evaluated under another scenario.

Conceptually:

```text
baseline evidence
→ tied finite-grid assignments
→ preserve all tied assignments
→ forward-evaluate each assignment under another supplied scenario
→ report the resulting set / range
```

### What may be claimed

- tied finite-grid assignments are not collapsed into an arbitrary point estimate;
- predictive equivalence at the baseline can be distinguished from behavior under another scenario;
- ambiguity can be carried into a downstream scenario-set analysis.

### What may not be claimed

This Showcase does not establish:

```text
global structural non-identifiability
continuous-parameter identifiability
causal counterfactual inference
causal effect estimation
```

## SHOWCASE-LEVEL8-MAINTENANCE-v1

### What it demonstrates

A qualified finite maintenance-decision-support workflow for a repairable asset model using supplied finite candidate parameters and explicitly defined scenarios.

The workflow brings together:

```text
finite-grid inverse estimation
→ reconstruction
→ cyclic forward evaluation
→ multiple explicit reward / cost axes
→ scenario comparison
→ one-at-a-time sensitivity / descriptive contribution
→ ambiguity preservation
→ checked serialization / handoff
→ objective-explicit scenario ranking
```

### What may be claimed

Within the supplied finite model and scenario formulas, the workflow demonstrates that the current engine can support a practical forward/reverse decision-analysis chain while preserving ambiguity and objective semantics.

### What may not be claimed

This Showcase does not establish that the model predicts a particular real industrial asset without calibration and external validation.

It also does not perform:

```text
continuous parameter inference
hidden-state inference
causal-effect estimation
arbitrary uncertainty-distribution propagation
optimal maintenance-policy search
```

A predefined scenario is not the same thing as an optimized policy, and objective-specific ranking is not an objective-free optimum.

## Relationship between the three Showcases

The three records serve different purposes:

| Showcase | Principal value |
|---|---|
| `SHOWCASE-WAVE2-CMP605-v1` | integrated finite forward/reverse recovery and verification |
| `SHOWCASE-WAVE1-KS503-v1` | finite-grid ambiguity preservation and downstream propagation |
| `SHOWCASE-LEVEL8-MAINTENANCE-v1` | practical multi-step decision-support workflow using the already-qualified capabilities |

The Level 8 maintenance Showcase uses the earlier promoted capabilities as supporting evidence rather than replacing them.

## Qualification boundary

Promotion means that the evidence record passed the project's Showcase promotion criteria for the exact qualified subject. It does not alter historical Gate statuses and does not turn known scoped limitations into defects.

For the current exact subject, current-subject failure count remains zero and current Public fix-candidate count remains zero.

See also:

- [Qualified scope status](qualified-scope-status.md)
- [v1 completion boundary](v1-completion-boundary.md)
- [v1 support matrix and handoff map](forward-v1-support-matrix.md)
