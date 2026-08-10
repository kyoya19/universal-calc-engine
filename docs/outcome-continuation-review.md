# 成果還元関数 continuation review

## Purpose

This document is the review surface for deciding what should be implemented next in the 成果還元関数 project without depending on private conversation history.

The current repository should be evaluated by missing capability, not by PR count or by the availability of another small boundary test.

## Current position

The repository now has a coherent Kiyotan-style forward v1 candidate path:

```text
checked external model input
→ parameter / formula resolution
→ structured model validation
→ expansion / evaluation
→ expected reward
→ expected elapsed time
→ optional reachability
→ ratio-of-expectations reward rate
→ contribution output
→ optional named reward axes
→ convergence diagnostics
→ structured forward result
```

It also has two higher-level analytical layers:

```text
same model + baseline/candidate parameters
→ structured scenario comparison
```

and:

```text
same model + baseline + one selected parameter + candidate values
→ one-at-a-time sensitivity
```

ObservationDataset remains a separate input surface for later reverse estimation.

## Implemented analytical boundaries

### Forward evaluation

The integrated facade composes the existing checked input and solver layers without replacing the lower-level APIs.

A valid model that reaches the configured iteration limit can return:

```text
ok: true
converged: false
```

with the last approximation and diagnostics. Input/validation failure remains distinct.

### Scenario comparison

Scenario comparison reuses one model structure and evaluates explicit baseline and candidate parameter sets.

The sign convention is:

```text
candidate - baseline
```

It reports resolved parameter differences and forward-result differences, including existing contribution-row differences and named reward-axis differences.

Contribution differences are labeled:

```text
difference_of_existing_contributions
```

They are descriptive and are not presented as a unique causal decomposition.

### One-at-a-time sensitivity

Sensitivity now changes exactly one selected supplied parameter for each candidate point while holding the caller's other baseline supplied values fixed.

The result declares:

```text
sensitivityKind: one_at_a_time
```

Each point reuses structured scenario comparison, so it can expose reward, time, rate, reachability, contribution, named-axis, and convergence information with an explicit single-variable counterfactual interpretation.

This is not a numerical derivative and is not a general multi-parameter attribution algorithm.

### Observation boundary

Observations remain first-class data distinct from:

- model definitions
- supplied parameter values
- evaluated values
- solver results

Current observation records include state counts, transition counts, and generic scalar metrics.

No observation is silently converted into a parameter value.

## Forward v1 assessment

The forward side is now sufficiently integrated to be treated as a **v1 candidate**, rather than an unfinished collection of isolated solver functions.

The strongest evidence is that a third party can supply checked external model input, vary parameters, obtain several forward results, compare scenarios, and run one-at-a-time sensitivity without importing private project context or writing a domain-specific core extension.

This does not mean the full 成果還元関数 concept is complete. In particular, reverse estimation and stronger attribution methods remain outside the current implementation.

## Highest-value remaining work

### 1. v1 support matrix / handoff map

The next highest-value step is to make the v1 boundary explicit for a third-party reviewer:

- supported model concepts
- supported scalar forms
- supported outputs
- comparison / sensitivity semantics
- observation boundary
- known mathematical limitations
- unsupported features
- stability / compatibility promises
- representative entry points and examples

This should be a concise implementation map tied to actual code, not a large speculative design document.

### 2. Minimal reverse-estimation contract

After the forward v1 support boundary is explicit, the next major capability candidate is a minimal Seikatan contract built on ObservationDataset.

The first reverse layer should define concepts such as:

```text
unknown parameter
candidate value / candidate set
observation dataset
constraint
score or likelihood result
estimation result
```

It should not jump directly to a large Bayesian engine.

A simple discrete candidate scorer is preferable if it can demonstrate the reverse boundary rigorously while preserving the separation between observations and model parameters.

### 3. Multi-parameter attribution only with an explicit method

Do not infer a unique additive cause from a multi-parameter scenario difference.

A future attribution layer must explicitly choose and document a method, for example:

- one-at-a-time marginal comparison
- ordered counterfactual contribution
- finite-difference sensitivity
- Shapley-style attribution

The method must define interactions rather than hiding them.

## Conditional gaps

These should not be prioritized until a generic representative model proves that they block real use:

- richer transition effects beyond `set_property`
- domain-facing aliases such as win probability beyond generic reachability
- automatic dimensional analysis / unit conversion
- more scalar-expression operators
- generated-target solver execution

## Maintenance gaps

These remain valid but lower priority than user-visible capability gaps:

- legacy/diagnostic solver-loop unification
- confirmed obsolete historical-doc cleanup
- internal organization improvements that do not change the public capability boundary

## Current non-goals

Do not move the core toward these merely because they are available examples:

- digipachi-specific functionality
- Juoh-specific functionality
- large Seikatan inference engines
- GUI implementation
- monetization implementation
- broad diffusion claims

Domain examples may be introduced later to prove genericity after the relevant generic core capability exists.

## Small-test boundary

Historical JSON/copy/text/report micro-tests remain useful regression coverage, but they must not become the main project path again.

New tests should primarily protect:

- new production behavior
- mathematical semantics
- compatibility boundaries
- meaningful failure cases

## Continuation criteria

Continue implementation when the work materially improves at least one of:

1. third-party usability,
2. analytical capability,
3. explanation of outcome changes,
4. forward/reverse separation,
5. reproducibility without private context,
6. handoff clarity.

A PR that only adds another near-duplicate formatting or identity test should normally rank below these goals.

## Preferred next production candidates

Recommended order after the sensitivity layer is stable:

1. concise forward-v1 support matrix / handoff implementation map,
2. minimal reverse-estimation contracts using ObservationDataset and discrete candidate parameters,
3. a small rigorous reverse scorer if the contract can be demonstrated without overbuilding,
4. explicit multi-parameter attribution only after choosing a defined mathematical method,
5. richer transition effects only when a generic example demonstrates a blocker,
6. solver-loop/internal cleanup as maintenance work.

## Suggested assistant prompt

```text
Read README.md, docs/forward-evaluation.md, docs/scenario-comparison.md, docs/parameter-sensitivity.md, docs/observations.md, docs/external-input.md, and docs/outcome-continuation-review.md.
Treat the integrated forward engine, scenario comparison, and one-at-a-time sensitivity as the current forward-v1 candidate boundary.
Do not return to near-duplicate JSON/copy boundary tests.
Choose the production work that most improves v1 support/handoff clarity or establishes the smallest rigorous reverse-estimation contract on ObservationDataset.
Do not implement a large Bayesian engine, multi-parameter causal attribution, digipachi/Juoh specialization, GUI, or monetization unless a later instruction explicitly changes scope.
```

## Current interpretation

The forward side has crossed an important threshold: the main missing issue is no longer whether expected reward, time, reachability, parameter variation, comparison, or one-at-a-time sensitivity can be represented at all.

The next decision is whether to harden/document this as a forward v1 boundary and then begin a minimal reverse contract. The recommended sequence is to make the v1 support map explicit first, then begin the smallest testable Seikatan foundation.
