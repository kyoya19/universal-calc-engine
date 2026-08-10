# Forward result handoff

## Purpose

`ForwardEvaluationResult` already provides the integrated forward calculation surface. This module adds a stable, versioned third-party handoff boundary above that result without changing any forward solver, validation rule, reward-rate formula, contribution calculation, or external-input parser.

Input:

```text
ForwardEvaluationResult
```

Output:

```text
ForwardResultHandoff
```

Public helpers:

```text
toForwardResultHandoff
forwardResultHandoffToJson
formatForwardResultHandoffPlainText
```

The handoff schema version is currently:

```text
schemaVersion: 1
```

## Third-party path

A complete checked forward consumer path is:

```text
external JSON / unknown
→ evaluateExternalModelJson / evaluateExternalModelInput
→ ForwardEvaluationResult
→ toForwardResultHandoff
→ ForwardResultHandoff
→ JSON or concise plain text
```

The handoff does not perform another evaluation. It summarizes the result already produced by the forward facade.

## Success structure

Every successful handoff contains:

```text
schemaVersion
kind: forward_evaluation_handoff
status: success
modelKind
converged
validation
expectedReward
expectedElapsedTime
rewardRate
contribution
diagnostics
optional reachability
warnings
limitations
```

For `reward_axes` models it additionally contains:

```text
rewardAxes
rewardAxesContribution
```

## Model kinds

The existing forward distinction remains explicit:

```text
base
reward_axes
```

The handoff does not merge these into an ambiguous generic output.

## Expected reward

The handoff preserves the existing structured output:

```text
startState
expectedReward
expectedRewardByState
```

Legacy scalar reward remains compatible with the original forward model. It does not gain invented unit metadata in the handoff.

## Expected elapsed time

The handoff preserves:

```text
expectedElapsedTimeSeconds
expectedElapsedTimeSecondsByState
```

Time input units are resolved by the existing model/evaluation layer before this handoff. The handoff does not introduce another unit-conversion mechanism.

## Reward rate

The existing reward-rate contract remains:

```text
rateKind: ratio_of_expectations
rewardPerSecond = E[reward] / E[elapsed time]
rewardPerHour = rewardPerSecond * 3600
```

It is not reinterpreted as:

```text
E[reward / elapsed time]
```

When expected elapsed time is zero, the existing result returns a null rate. The handoff adds the warning:

```text
reward_rate_unavailable_zero_expected_time
```

It does not invent a denominator or epsilon.

## Reachability

When the caller requested reachability targets, the handoff preserves:

```text
targetStates
probabilityFromStart
probabilityByState
```

It also states the limitation:

```text
reachability_is_generic_not_domain_win_probability
```

No domain-specific win meaning is inferred from target-state reachability.

## Named reward axes

For `reward_axes` models the handoff preserves each independent axis, its metadata, expected values, and transition contributions.

The handoff never implicitly:

```text
nets benefit and cost axes
converts units
assigns exchange rates
creates a single utility score
```

This is recorded through:

```text
named_reward_axes_not_implicitly_netted_or_converted
```

## Contribution boundary

The handoff preserves existing transition contribution rows.

They are descriptive expected-value decomposition. They are not automatically interpreted as causal attribution, Shapley value, counterfactual causal effect, or unique interaction allocation.

The limitation code is:

```text
contribution_is_descriptive_not_causal_attribution
```

## Solver convergence

Forward evaluation deliberately distinguishes evaluation success from numerical convergence.

A structurally valid model may return:

```text
ok: true
converged: false
```

with the solver's last approximation and explicit diagnostics.

The handoff preserves that behavior exactly. It does not convert non-convergence into fabricated convergence or silently discard the numerical output.

When any requested solver did not converge, the handoff adds:

```text
one_or_more_solvers_did_not_converge
```

and includes the limitation:

```text
non_convergence_keeps_last_approximation
```

Consumers must inspect `converged` and the per-solver diagnostics before treating numerical values as stable.

## Validation warnings

A successful result may still carry non-fatal structured validation warnings.

When present, the handoff adds:

```text
model_validation_warnings_present
```

The original validation issues remain available in the structured `validation` field.

## Failure structure

Checked forward failures remain failures.

The handoff preserves:

```text
schemaVersion: 1
kind: forward_evaluation_handoff
status: failure
stage
issues
optional validation
```

The existing forward stages remain visible, including:

```text
json_syntax
shape
parameter_resolution
model_validation
evaluation_options
evaluation
```

No expected reward, time, rate, reachability, contribution, or convergence result is fabricated for a failed evaluation.

## JSON and plain text

Machine-readable serialization:

```text
forwardResultHandoffToJson
```

Concise consumer view:

```text
formatForwardResultHandoffPlainText
```

The plain-text helper is a presentation of the structured handoff, not another calculation or report engine.

## Versioning boundary

External model input already uses `schemaVersion: 1`. The forward result handoff now has its own explicit `schemaVersion: 1`.

This does not change the repository package version and does not claim that every internal/legacy helper is a versioned wire protocol. The version applies to the `ForwardResultHandoff` contract itself.

## Compatibility

This addition is additive:

```text
ForwardEvaluationResult remains available
forwardEvaluationResultToJson remains available
existing solver APIs remain available
existing external input APIs remain available
scenario comparison remains unchanged
parameter sensitivity remains unchanged
```

Consumers that need a stable third-party summary can use `ForwardResultHandoff`; existing typed callers do not need to migrate.

## Non-goals

This module does not add:

- a new solver;
- exact closed-form Markov analysis;
- automatic unit conversion beyond existing time normalization;
- implicit reward-axis netting;
- confidence intervals;
- Bayesian inference;
- causal attribution;
- a complete TeX renderer;
- GUI or web API packaging.
