# 成果還元関数 continuation review

## Purpose

This document is a review surface for deciding whether the 成果還元関数 project should be continued, paused, handed off, narrowed, or expanded.

It does not assume that continuation or handoff is already required.

The goal is to make the current state reviewable without depending on a single conversation thread, a single assistant memory, or a single contributor's private context.

## Positioning

成果還元関数 is a model for separating state, transition, probability, reward, time, parameters, observations, evaluated results, and contribution information, then explaining how those factors relate to an outcome.

In this repository, the current implementation is a core calculation engine for explicit probabilistic state-transition models.

The repository should not treat broad diffusion, commercial use, product UI, or large domain-specific examples as the immediate phase.

## Current implemented surface

The current implementation has a coherent forward-evaluation and scenario-comparison path:

- definition / expanded / evaluated model types
- expected reward solving
- reachability probability solving
- unit-aware transition elapsed time normalized to seconds
- expected elapsed time solving through downstream transitions
- reward-per-time output with explicit ratio-of-expectations semantics
- named reward-axis definitions with explicit unit and benefit / cost / neutral metadata
- independent expected-reward solving for multiple named axes
- legacy and named-axis contribution results without implicit cross-axis aggregation
- structured validation with machine-readable code, severity, path, and message
- solver convergence diagnostics with solver kind, convergence status, iterations, tolerance, last max delta, and contextual target or reward-axis metadata
- parameter definitions with optional defaults and descriptive label / unit metadata
- explicit parameter-reference scalar nodes
- explicit add / subtract / multiply / divide formula nodes
- repeated resolution of one model with different supplied parameter values
- circular / missing / unknown / non-finite parameter-resolution guards
- versioned external model documents for base and named-reward-axis models
- unknown / JSON shape parsing that rebuilds recognized parameterized model structures instead of trusting casts
- separated external input failure stages: JSON syntax, shape, parameter resolution, and model validation
- typed ObservationDataset input distinct from definitions, supplied parameters, evaluated values, and solver results
- state-count, transition-count, and generic scalar observations
- observation JSON parsing and model-linked reference validation
- an additive forward-evaluation facade composing checked input, resolution, validation, evaluation, solvers, reward rate, contributions, named axes, and diagnostics
- explicit `ok: true / converged: false` behavior when a valid model does not converge within the selected iteration limit
- structured scenario comparison that reuses one model structure under baseline and candidate parameter sets
- resolved parameter deltas and forward-result deltas using `candidate - baseline`
- legacy and named reward-axis contribution-row deltas labeled as descriptive differences rather than unique causal attribution
- non-domain-specific representative examples for forward evaluation and scenario comparison
- JSON serialization helpers
- TeX and report boundary pieces
- a representative Sugoroku PoC boundary
- explicit-only solver target policy coverage

This is enough to show that the project is not only a note or isolated PoC. It now has a reusable forward calculation path and a first-class scenario-comparison layer that a third party can enter from checked external input.

## Forward v1 candidate status

The current forward engine is a credible **v1 candidate boundary** for these tasks:

```text
checked model input
→ parameterized scenario resolution
→ semantic validation
→ expected reward
→ expected elapsed time
→ optional reachability
→ ratio-of-expectations reward rate
→ contribution output
→ optional named reward axes
→ convergence diagnostics
→ structured result
```

The scenario-comparison layer extends that boundary to:

```text
one model
+ baseline parameters
+ candidate parameters
→ two forward results
→ parameter deltas
→ outcome deltas
→ descriptive contribution-row deltas
```

This does not mean the whole 成果還元関数 research concept is complete.

It means the minimal Kiyotan-style forward path is integrated enough that additional work should be justified by a specific missing analytical capability rather than by finding another isolated API or boundary test.

## Current non-goals

The following are not current-phase requirements:

- generated target solver execution
- runtime target policy replacement
- full reverse estimation
- product UI
- monetization planning
- domain-specific digipachi work
- domain-specific Juoh work
- broad external diffusion

## Current gaps

Important remaining gaps are now different from the earlier forward-core gaps.

### High-value gaps

- one-at-a-time sensitivity output that changes exactly one selected parameter while holding the others at a declared baseline
- counterfactual comparison helpers that make the changed variable and comparison rule explicit
- multi-parameter attribution methods only after a method such as ordered marginal, Shapley-style, or another defined rule is selected
- a concise v1 support matrix / handoff map stating what the current engine supports and what it does not
- a minimal reverse-estimation contract built on the existing ObservationDataset boundary

### Conditional gaps

These should be implemented only when a representative model proves the requirement:

- richer transition effects beyond `set_property`
- domain-facing aliases such as "win probability" beyond generic reachability
- automatic dimensional analysis / unit conversion
- additional scalar-expression operators

### Maintenance gaps

- legacy/diagnostic solver-loop unification after the diagnostic contract is stable
- historical docs cleanup where files are confirmed obsolete or misleading

These maintenance items should not outrank missing outcome capabilities merely because they are easier to implement.

## Observation / reverse boundary

Observations are first-class data, but reverse inference is not yet implemented.

The intended separation is:

```text
model definition + supplied parameters
→ forward evaluation / scenario comparison
```

versus:

```text
parameterized model + ObservationDataset + candidates / constraints
→ later score / likelihood / estimation result
```

Observed counts must not be silently converted into model parameters just to avoid designing the reverse boundary.

## Why one-at-a-time sensitivity is now the leading forward candidate

Structured scenario comparison now exists, but a multi-parameter comparison still cannot identify a unique cause for the total outcome change.

For example, a candidate can simultaneously change:

```text
success probability
attempt time
reward amount
```

and the comparison layer can report the resulting deltas, but it deliberately does not claim a unique additive parameter attribution.

The next low-risk analytical step is a one-at-a-time sensitivity layer:

```text
baseline parameter set
+ selected parameter
+ candidate value(s)
→ scenarios where only that parameter changes
→ forward deltas for each candidate
```

That gives a clear counterfactual meaning without requiring a full Shapley or path-dependent attribution engine.

It also directly supports later sensitivity tables and parameter sweeps while reusing the current parameterized model and scenario-comparison boundaries.

## Contribution semantics

The current scenario comparison returns:

```text
contributionDeltaKind: difference_of_existing_contributions
```

This is intentionally weaker than a causal-attribution claim.

The existing contribution rows explain how each transition contributes within each solved scenario. Their difference is useful descriptive evidence, but when several model parameters change together, interaction effects may prevent a unique additive explanation.

Any later attribution feature must state its method explicitly.

## Continuation criteria

Continuation becomes easier to justify when at least one of the following improves:

1. The engine evaluates a broader class of meaningful outcome questions.
2. The output explains a change in outcome, not only an absolute value.
3. A future contributor can reproduce a full path without private context.
4. A third party can supply checked model input and receive structured results.
5. Scenario changes have explicit counterfactual semantics.
6. Observations remain cleanly separated for later reverse inference.
7. A representative generic example demonstrates a feature before a large domain-specific model is added.

Continuation is weaker when work only adds more near-duplicate boundary tests or formatting variants without changing calculation capability or reviewability.

## Handoff criteria

Handoff is not assumed.

If handoff is considered later, the repository should first satisfy these conditions:

- README explains the current phase.
- active docs identify implemented and unsupported behavior.
- a new contributor can run or read representative end-to-end forward and scenario-comparison examples.
- external model input can be traced from document shape to validated resolved model and facade result.
- ObservationDataset is documented separately from model parameters.
- the next production candidates are ranked by missing capability, not PR count.
- large domain samples remain separate from the core engine.

## Small-test boundary

Historical work added many JSON, copy, text, report, summary, overview, audit, and digest boundary tests.

That reinforcement remains useful, but it must not become the main path again.

Further micro-tests should be added only when they protect a new feature, fix a bug, or clarify an important reviewed boundary.

## Preferred next production candidates

Recommended next candidates, in order:

1. One-at-a-time sensitivity / parameter sweep built on the structured scenario-comparison API.
2. A concise v1 support matrix / handoff map once the sensitivity boundary is stable.
3. Minimal reverse-estimation contracts using ObservationDataset, candidate parameters, score/likelihood, and estimation result types without jumping directly to a large Bayesian engine.
4. Multi-parameter attribution only after an explicit method is selected and documented.
5. Richer transition effects only when a generic example demonstrates a real blocker.
6. Internal solver-loop unification as maintenance work after user-facing capability gaps are smaller.

## Avoided paths

Avoid these paths unless a later PR explicitly narrows the scope:

- adding micro-tests just because a small gap can be found
- implicitly combining named reward axes with different meanings or units
- changing legacy scalar `reward` semantics as a side effect of another feature
- silently replacing existing expand/evaluate exception behavior with validation-result behavior
- silently changing legacy solver defaults or non-convergence exception behavior
- using string `eval` or executable formula text
- treating successful JSON parsing as model type validation
- mixing observations into parameter definitions
- assigning a unique additive cause to a multi-parameter scenario difference without a defined attribution method
- moving into digipachi or Juoh before a generic capability demonstrates the need
- moving into a large Seikatan implementation before a minimal reverse contract exists
- mixing personal or financial circumstances into technical repository docs
- treating handoff as already decided

## Suggested assistant prompt

A future assistant or contributor can start with this prompt:

```text
Read README.md, docs/forward-evaluation.md, docs/scenario-comparison.md, docs/observations.md, docs/external-input.md, docs/parameterized-scalars.md, and docs/outcome-continuation-review.md.
Summarize the current forward-v1 candidate boundary of kyoya19/universal-calc-engine.
Do not continue adding near-duplicate JSON/copy boundary tests.
Choose the production PR that most improves one-at-a-time sensitivity, explicit counterfactual explanation, v1 support/handoff clarity, or the minimal contract needed for later reverse estimation.
Keep digipachi, Juoh, large Seikatan inference, GUI, and monetization out of scope unless a later instruction explicitly changes the phase.
```

## Current interpretation

The project should not be aggressively diffused yet.

It also should not be discarded solely because its immediately estimated impact is modest.

The current best path is to treat the integrated forward engine plus structured scenario comparison as a v1 candidate, add one-at-a-time sensitivity with explicit counterfactual semantics, then reassess whether the next highest-value step is v1 handoff hardening or minimal reverse estimation.
