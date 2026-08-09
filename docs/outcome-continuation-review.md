# 成果還元関数 continuation review

## Purpose

This document is a review surface for deciding whether the 成果還元関数 project should be continued, paused, handed off, narrowed, or expanded.

It does not assume that continuation or handoff is already required.

The goal is to make the current state reviewable without depending on a single conversation thread, a single assistant memory, or a single contributor's private context.

## Positioning

成果還元関数 is a model for separating state, transition, probability, reward, time, observations, and evaluated results, then explaining how those factors contribute to an outcome.

In this repository, the current implementation is a core calculation engine for testing that idea through explicit probability state transition models.

The repository should not treat broad diffusion, commercial use, product UI, or domain-specific examples as the immediate phase.

## Current implemented surface

The current implementation already has a small but working forward-evaluation base:

- definition model types
- expanded model types
- evaluated model types
- expected reward solving
- reachability probability solving
- unit-aware transition elapsed time normalized to seconds
- expected elapsed time solving through downstream transitions
- reward-per-time output with explicit ratio-of-expectations semantics
- named reward-axis definitions with explicit unit and benefit / cost / neutral metadata
- independent expected-reward solving for multiple named axes
- reward-axis output and contribution results without implicit cross-axis aggregation
- legacy scalar reward behavior preserved separately from named reward axes
- structured validation results with machine-readable code, severity, path, and message
- base-model and named-reward-axis validation without requiring exception-string parsing
- JSON serialization for validation results
- output result conversion
- contribution result conversion
- transition probability audits
- JSON serialization helpers
- TeX and report boundary pieces
- boundary report status summaries and overviews
- boundary report digest helpers
- number text formatting boundaries
- a representative Sugoroku PoC boundary
- explicit-only solver target policy coverage

This is enough to show that the project is not only a note or idea. It is an executable proof-of-concept for a limited forward calculation pipeline.

## Current non-goals

The following are not current-phase requirements:

- generated target solver execution
- runtime target policy replacement
- reverse estimation
- Seikatan behavior
- product UI
- monetization planning
- domain-specific digipachi work
- domain-specific Juoh work
- broad external diffusion

These may become later work items only after a dedicated scope decision.

## Current gaps

The project is not yet a complete general-purpose 成果還元関数 engine.

Important gaps include:

- solver convergence diagnostics
- parameter references
- formula or expression scalar specs
- richer transition effects
- domain-labeled win probability output
- observation input surfaces
- reverse estimation design
- external user input templates
- GUI contracts
- handoff-ready implementation map

## Review question

The next project decision is not "who should inherit this?"

The next project decision is:

```text
Is there enough reusable value to continue organizing the project, and if so, what is the smallest next implementation step that improves that judgment?
```

This question should be answered from the repository state and documented scope, not from private personal circumstances.

## Continuation criteria

Continuation becomes easier to justify when at least one of the following improves:

1. The engine can evaluate more than expected reward.
2. The model can express time, reachability, or multiple outcome axes.
3. The output explains why an outcome changed, not only what the value is.
4. A future contributor can read the repository and choose the next small PR without private context.
5. A non-domain-specific example demonstrates usefulness outside the original PoC.

Continuation is weaker when work only adds more near-duplicate boundary tests without changing reviewability or calculation capability.

## Handoff criteria

Handoff is not assumed.

If handoff is considered later, the repository should first satisfy these conditions:

- README explains the current phase.
- This review document explains continuation versus pause.
- Active docs identify what is implemented and what is not implemented.
- The next production candidates are visible.
- Domain-specific samples remain clearly separated from the core engine.
- Personal circumstances are not required to understand the technical state.
- A new assistant or contributor can avoid repeating micro-test-only progress.

## Small-test boundary

Recent work added many JSON, copy, text, report, summary, overview, audit, and digest boundary tests.

That reinforcement is useful, but it should not remain the main path.

Further micro-tests should be added only when they protect a new feature, fix a bug, or clarify a reviewed boundary.

## Preferred next production candidates

The next production work should move the engine closer to a minimal Kiyotan-style forward evaluator.

Reachability probability, expected elapsed time, ratio-of-expectations reward rate, named multiple reward axes, and structured model validation are now present in the core. Recommended next candidates, in order:

1. Solver convergence diagnostics.
2. Parameter references and richer scalar specs.
3. Clear input template for external users.
4. Observation input surface preparation for later reverse estimation.
5. Domain-labeled win probability output where a domain-facing label adds value beyond generic reachability.
6. Richer transition effects where a representative generic model demonstrates the requirement.

The first recommended candidate is solver convergence diagnostics because the forward solvers currently fail with a generic non-convergence exception after a fixed iteration limit. A structured diagnostic should expose solver kind, iteration count, tolerance, last delta, and affected axis or target context without changing the mathematical result when convergence succeeds.

## Avoided paths

Avoid these paths unless a later PR explicitly narrows the scope:

- adding micro-tests just because a small gap can be found
- implicitly combining named reward axes with different meanings or units
- changing legacy scalar `reward` semantics as a side effect of the multiple-axis feature
- silently replacing existing expand/evaluate exception behavior with validation-result behavior
- moving into digipachi or Juoh before the core forward engine is clearer
- moving into Seikatan before the forward model surface is stronger
- mixing personal or financial circumstances into technical repository docs
- claiming large social impact before the project can demonstrate reusable value
- treating handoff as already decided

## Suggested assistant prompt

A future assistant or contributor can start with this prompt:

```text
Read README.md, docs/sugoroku-poc-v0.4-boundary.md, docs/reward-axes.md, docs/structured-validation.md, and docs/outcome-continuation-review.md.
Summarize the current phase of kyoya19/universal-calc-engine.
Do not continue adding near-duplicate JSON/copy boundary tests.
Choose the smallest PR that improves continuation judgment or moves the core toward a minimal Kiyotan-style forward evaluator.
Keep digipachi, Juoh, Seikatan, GUI, and monetization out of scope unless a later instruction explicitly changes the phase.
```

## Current interpretation

The project should not be aggressively diffused yet.

It also should not be discarded solely because its immediately estimated impact is modest.

The best current path is to preserve enough structured information for a good continuation decision, then add production features that improve the engine's reviewable usefulness.
