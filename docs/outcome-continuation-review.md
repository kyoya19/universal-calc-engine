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

The current implementation already has a working forward-evaluation base:

- definition / expanded / evaluated model types
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
- solver convergence diagnostics with solver kind, convergence status, iterations, tolerance, last max delta, and contextual target or reward-axis metadata
- diagnostic solver variants for expected reward, reachability, expected elapsed time, and named reward axes
- explicit non-convergence results that preserve the last approximation while legacy solver exception behavior remains unchanged
- parameter definitions with optional defaults and descriptive label / unit metadata
- explicit parameter-reference scalar nodes
- explicit add / subtract / multiply / divide formula scalar nodes
- parameter and formula resolution for probability, legacy reward, elapsed time, and named reward-axis values
- repeated resolution of one model with different supplied parameter values
- circular / missing / unknown / non-finite parameter-resolution guards
- versioned external model documents for base and named-reward-axis models
- unknown / JSON shape parsing that rebuilds recognized parameterized model structures instead of trusting casts
- separated external input failure stages: JSON syntax, shape, parameter resolution, and model validation
- external preparation into validated ordinary DefinitionModel / RewardAxesDefinitionModel values
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

This is enough to show that the project is not only a note or idea. It is an executable proof-of-concept with a reusable forward calculation pipeline and an explicit third-party input boundary.

## Current non-goals

The following are not current-phase requirements:

- generated target solver execution
- runtime target policy replacement
- full reverse estimation
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

- observation input surfaces that remain distinct from definition parameters and evaluated results
- reverse estimation design built on an explicit observation boundary
- a non-domain-specific end-to-end example that starts from external JSON and demonstrates several forward outputs together
- richer transition effects where a generic example proves that the current set-property effect is insufficient
- domain-labeled win probability output where a domain-facing name adds value beyond generic reachability
- automatic dimensional analysis / unit conversion if concrete use cases justify it
- GUI contracts
- handoff-ready implementation map
- legacy/diagnostic solver-loop unification after the diagnostic contract stabilizes

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
4. A future contributor can read the repository and choose the next production PR without private context.
5. A third party can provide checked input without importing private TypeScript object construction assumptions.
6. A non-domain-specific example demonstrates usefulness outside the original PoC.

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
- External model input can be traced from document shape to validated resolved model.

## Small-test boundary

Recent historical work added many JSON, copy, text, report, summary, overview, audit, and digest boundary tests.

That reinforcement is useful, but it should not remain the main path.

Further micro-tests should be added only when they protect a new feature, fix a bug, or clarify a reviewed boundary.

## Preferred next production candidates

The next production work should move the engine closer to a minimal Kiyotan-style forward evaluator with a clean boundary between model definition, supplied parameters, observations, and evaluated results.

Reachability probability, expected elapsed time, ratio-of-expectations reward rate, named multiple reward axes, structured model validation, solver convergence diagnostics, parameter/formula scalar resolution, and a checked external JSON input boundary are now present.

Recommended next candidates, in order:

1. Observation input surface preparation for later reverse estimation.
2. A non-domain-specific end-to-end external-input example that demonstrates reward, reachability, time, and parameter variation together.
3. Richer transition effects only where that example or another generic model proves a requirement.
4. Domain-labeled win probability output where a domain-facing label adds value beyond generic reachability.
5. Internal solver-loop unification after the diagnostics contract is stable.
6. Dimensional analysis only if concrete models show that descriptive unit metadata is insufficient.

The first recommended candidate is an observation input surface because the project now has a clear definition/parameter/input path, but later Seikatan work still needs observations to be first-class data rather than being mixed into parameters or results. The next step should define observation records and validation semantics without implementing a large inference engine.

## Avoided paths

Avoid these paths unless a later PR explicitly narrows the scope:

- adding micro-tests just because a small gap can be found
- implicitly combining named reward axes with different meanings or units
- changing legacy scalar `reward` semantics as a side effect of the multiple-axis feature
- silently replacing existing expand/evaluate exception behavior with validation-result behavior
- silently changing legacy solver defaults or non-convergence exception behavior while adding diagnostics
- using string `eval` or executable formula text for parameter expressions
- treating successful JSON parsing as model type validation
- mixing observation data into parameter definitions merely to avoid creating an observation boundary
- moving into digipachi or Juoh before the core forward engine is clearer
- moving into full Seikatan before observations have a stable typed boundary
- mixing personal or financial circumstances into technical repository docs
- claiming large social impact before the project can demonstrate reusable value
- treating handoff as already decided

## Suggested assistant prompt

A future assistant or contributor can start with this prompt:

```text
Read README.md, docs/sugoroku-poc-v0.4-boundary.md, docs/reward-axes.md, docs/structured-validation.md, docs/solver-diagnostics.md, docs/parameterized-scalars.md, docs/external-input.md, and docs/outcome-continuation-review.md.
Summarize the current phase of kyoya19/universal-calc-engine.
Do not continue adding near-duplicate JSON/copy boundary tests.
Choose the production PR that most improves a minimal Kiyotan-style forward evaluator, third-party usability, or the explicit boundary needed for later Seikatan work.
Keep digipachi, Juoh, full Seikatan inference, GUI, and monetization out of scope unless a later instruction explicitly changes the phase.
```

## Current interpretation

The project should not be aggressively diffused yet.

It also should not be discarded solely because its immediately estimated impact is modest.

The current best path is to finish the reusable model/input/observation boundaries and demonstrate one coherent non-domain-specific end-to-end flow before moving into large domain models or reverse inference.
