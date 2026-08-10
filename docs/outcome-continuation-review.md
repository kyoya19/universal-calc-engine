# 成果還元関数 continuation review

## Current decision

Repository-wide completion reviewの結果、現在の分析coreは:

```text
Kiyotan forward v1
+
finite-candidate / finite-assignment centered Seikatan v1
```

として **functional-contract v1 boundary** に到達したと判断します。

Authoritative completion boundary:

```text
docs/v1-completion-boundary.md
```

Support matrix:

```text
docs/forward-v1-support-matrix.md
```

## Completion review result

Critical production gaps:

```text
0
```

High production gaps:

```text
0
```

最後に見つかったhigh completion gapは、forward側にversioned third-party result handoffがなかったことでした。

これは現在:

```text
ForwardEvaluationResult
→ toForwardResultHandoff
→ ForwardResultHandoff
```

で閉じています。

Forward / reverseとも、checked third-party inputからversioned result handoffまで一続きに到達できます。

## Complete third-party forward path

```text
external JSON / unknown
→ evaluateExternalModelJson / evaluateExternalModelInput
→ checked parsing / parameter resolution / validation
→ integrated forward evaluation
→ ForwardEvaluationResult
→ toForwardResultHandoff
→ ForwardResultHandoff
→ JSON / concise plain text
```

Forward handoff version:

```text
schemaVersion: 1
kind: forward_evaluation_handoff
```

## Complete third-party reverse path

```text
external reverse JSON / unknown
→ estimateExternalReverseJson / estimateExternalReverseInput
→ checked model / ObservationDataset / request parsing
→ selected typed estimator
→ ExternalReverseMethodResult
→ toReverseResultHandoff
→ ReverseResultHandoff
→ JSON / concise plain text
```

Reverse handoff version:

```text
schemaVersion: 1
kind: reverse_estimation_handoff
```

## Current Seikatan reverse kinds

```text
discrete_parameter_candidates
scalar_gaussian_parameter_candidates
composite_parameter_candidates
multi_parameter_transition_grid
multi_parameter_composite_grid
```

Statistical / search contracts remain:

```text
conditional_transition_log_likelihood_without_multinomial_constant
conditionally_independent_gaussian_scalar_log_likelihood
transition_plus_scalar_gaussian_composite_log_likelihood
finite_cartesian_parameter_grid
```

## Boundaries that must remain unchanged unless explicitly versioned

### External reverse parser

Do not silently:

```text
deduplicate candidates
truncate or sample grids
invent sigma
replace zero sigma with epsilon
infer predictors from metric names
convert units
auto-clip constraints
infer evidence partition
infer independence assumptions
copy observations into parameters
```

### Multi-parameter search

Keep:

```text
finite Cartesian grid
mandatory maxCombinations
per-parameter constraints before expansion
rawCombinationCount
eligibleCombinationCount
unique / tied / no-possible finite-grid identifiability
```

### Composite semantics

Keep explicit:

```text
transition_and_scalar_evidence_conditionally_independent_given_candidate
```

Transition impossible events remain impossible even with finite scalar evidence.

Scalar predictor non-convergence must not become likelihood evidence.

### Prior / posterior

All current reverse methods remain:

```text
priorUsed: false
posteriorComputed: false
```

`relativeLikelihoodToBest` remains a likelihood ratio, not posterior probability.

### Forward non-convergence

A checked forward result may be:

```text
ok: true
converged: false
```

with explicit diagnostics and last approximation.

Do not fabricate convergence or silently discard the result.

### Reward rate

Keep:

```text
rateKind = ratio_of_expectations
E[reward] / E[elapsed time]
```

Do not reinterpret it as `E[reward / elapsed time]`.

### Contribution / causality

Forward contribution, scenario differences, sensitivity, candidate ranking, and multi-parameter estimation are not automatically causal attribution.

Do not introduce undefined Shapley / causal allocation language without a separately defined method.

## Remaining medium / low gaps

These do not block the current v1 functional contract.

### Medium

```text
npm/package distribution contract is not 1.0
TeX/report surface remains partial
transition effects beyond set_property remain partial
no exact/closed-form solver family
no automatic unit conversion/general dimensional algebra
```

### Low / compatibility

```text
legacy discrete-specific checked reverse APIs remain
historical report/boundary helpers remain exported
some docs overlap by design for handoff safety
```

These should be changed only when the practical benefit exceeds compatibility cost.

## Package-release distinction

Current declaration:

```text
v1 functional contract
```

is not the same as:

```text
npm package version 1.0.0
```

Distribution work is separate and should define package name, exports map, build output, declarations, semantic-version policy, and release process before changing package metadata.

## Post-v1 candidates

Do not implement these mechanically.

Possible future work only after a concrete generic use case appears:

```text
package/distribution hardening
complete renderer/report layer
richer transition effects
exact or alternative solver family
automatic dimensional/unit system
continuous/adaptive optimization
Bayesian prior/posterior
non-Gaussian or correlated likelihoods
hidden-state inference
confidence/credible intervals
explicit causal attribution method
large domain applications
```

## Bayesian boundary

Bayesian work remains low priority until a concrete prior source exists.

If introduced, define separately:

```text
prior mass / density
likelihood
evidence normalization
posterior
```

Never rename existing `relativeLikelihoodToBest` into posterior probability.

## Test policy after v1

New tests should primarily protect:

```text
production behavior
mathematical/statistical semantics
schema / compatibility boundaries
important failure modes
```

Do not return to near-duplicate micro-test growth as a project objective.

## Change-selection rule after v1

Before adding a new capability, answer:

1. Which generic use case cannot be represented by current v1?
2. What mathematical/statistical assumption is genuinely new?
3. Can current solvers/scorers be reused?
4. Does checked input need a new schema kind/version?
5. Does the result need a new handoff field/version?
6. What failure, convergence, or identifiability boundary must remain explicit?
7. Is the compatibility cost justified?

If these questions do not produce a clear value case, do not add the feature.

## Handoff reading order

```text
README.md
docs/v1-completion-boundary.md
docs/forward-v1-support-matrix.md
docs/external-input.md
docs/forward-evaluation.md
docs/forward-result-handoff.md
docs/scenario-comparison.md
docs/parameter-sensitivity.md
docs/observations.md
docs/discrete-estimation.md
docs/scalar-gaussian-estimation.md
docs/composite-likelihood-estimation.md
docs/multi-parameter-grid-estimation.md
docs/multi-parameter-composite-grid-estimation.md
docs/reverse-external-methods.md
docs/reverse-result-handoff.md
docs/outcome-continuation-review.md
```

## Next priority

The next task should **not** be another statistical family by default.

First choose among:

```text
1. stop and treat current core as the functional-contract v1 safe point;
2. packaging/distribution hardening if external distribution becomes a real goal;
3. a concrete generic/domain application used specifically to validate missing core capability;
4. a demonstrated post-v1 analytical gap with explicit semantics.
```

If no such concrete need exists, maintaining the current v1 boundary is the correct next action.
