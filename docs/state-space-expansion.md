# State Space Expansion Design

## Purpose

This document defines the next implementation boundary between state generation helpers and solver integration.

The current solver continues to use explicit `transition.to` semantics. The new `effects[]` based state generation path is treated as a candidate-generation and validation layer until the graph expansion behavior is implemented and tested.

## Current confirmed boundary

- `TransitionDefinition.to` remains the authoritative target state for solver execution.
- `TransitionDefinition.effects[]` describes how to derive candidate successor state properties from the source state.
- `applyTransitionEffects()` applies effects to a state property object.
- `stateIdFromProperties()` derives a deterministic generated state id from properties.
- `generateNextStateCandidate()` derives one candidate successor state from one transition.
- `generateNextStateCandidates()` derives unique candidate successors from multiple transitions.
- `expandOneStateStep()` filters outgoing transitions by `state.id` and derives one-step candidate successors.
- `expandStateSpace()` creates an inspectable generated graph without changing solver behavior.
- `expandGraphFromModel()` derives the seed state from `DefinitionModel.startState` and expands an inspectable generated graph.
- `summarizeStateGraph()` reports graph counts, diagnostic counts, and explicit/generated target match rates.
- `selectGraphTarget()` currently supports only `explicit_only` and returns `explicitTo`.
- `solveExpectedReward()` uses an explicit-only internal target helper and still resolves downstream states from `transition.to`.
- `toContributionResult()` uses the same explicit-only target boundary and still reports explicit `transition.to` targets.

## Sugoroku PoC v0.3 completion boundary

The Sugoroku PoC v0.3 completion target is not generated-target solver execution. The v0.3 completion target is an explicit-only solver PoC with state generation and graph diagnostics available beside the solver.

A minimal v0.3 completion should satisfy all of the following:

1. The existing Sugoroku expected reward calculation remains unchanged.
2. State, transition, probability, reward, and terminal condition definitions remain separated.
3. `effects[]` can derive generated successor candidates.
4. Generated candidates can be expanded into an inspectable graph.
5. The graph summary reports explicit/generated match and mismatch counts.
6. The solver continues to execute in explicit-only mode using `transition.to`.
7. A regression test proves that `effects[]` does not override explicit solver targets.
8. Typecheck and test both pass.

The following are intentionally outside v0.3 completion:

- using `generatedTo` as the solver target,
- auto-rewriting explicit targets from generated candidates,
- inferring rewards, probabilities, or terminal behavior from generated states,
- introducing Seikatan reverse estimation,
- adding non-constant formula effects.

## Non-goals for the next implementation step

- Do not connect generated candidates directly to the solver.
- Do not replace explicit `transition.to` behavior.
- Do not infer rewards, terminal conditions, or probabilities from generated candidates.
- Do not add formula effects in the same PR as graph expansion.
- Do not start Seikatan or Juoh PoC work from this layer.

## Graph expansion model

The graph expansion layer should produce an expanded state graph from:

1. seed states,
2. transition definitions,
3. generated candidate successor states from `effects[]`, and
4. explicit transitions already present in the definition model.

The first implementation should be breadth-first and bounded. It should avoid solver behavior changes and return data that can be inspected by tests.

Current output shape:

```ts
export type ExpandedStateGraph = {
  states: StateDefinition[];
  generatedStates: StateDefinition[];
  edges: ExpandedStateEdge[];
  diagnostics: StateExpansionDiagnostic[];
};

export type ExpandedStateEdge = {
  from: string;
  explicitTo: string;
  generatedTo?: string;
  transition: TransitionDefinition;
};

export type StateExpansionDiagnostic = {
  type:
    | 'missing_generated_candidate'
    | 'explicit_generated_mismatch'
    | 'duplicate_state_ignored'
    | 'depth_limit_reached'
    | 'max_states_reached';
  transition?: TransitionDefinition;
  stateId?: string;
  message: string;
};

export type GraphTargetPolicy = 'explicit_only';
```

## Expansion algorithm

1. Start from the given seed states.
2. Maintain a queue of unexpanded states.
3. For the current state, find outgoing transitions by `transition.from === state.id`.
4. For each outgoing transition:
   - keep `transition.to` as `explicitTo`,
   - derive a generated candidate from `effects[]` when present,
   - record both explicit and generated targets in an edge object,
   - add the generated state to the graph if it is new and within the expansion limit.
5. Continue until the queue is empty or the configured limit is reached.

## Explicit target and generated target priority

For the graph expansion layer:

- `explicitTo` is retained for compatibility with existing definitions and solver behavior.
- `generatedTo` is retained as the effects-derived candidate.
- A mismatch between `explicitTo` and `generatedTo` is diagnostic information, not an automatic rewrite.

For future solver integration:

- solver input must choose one authoritative target per edge,
- that choice must be made in a separate PR,
- the initial safe choice should keep explicit `transition.to` authoritative and use generated targets only for diagnostics.

## Solver integration gate

The next solver-facing PR should still keep `transition.to` authoritative by default.

Generated targets may be used only as validation and inspection data until all of the following are true:

1. `summarizeStateGraph()` reports the explicit/generated match rate for the target model.
2. Any explicit/generated mismatch is either fixed in the model definition or intentionally documented.
3. Edges without generated targets are intentionally allowed for legacy or hand-authored transitions.
4. Existing solver tests pass without changing expected values.
5. The solver-facing PR clearly states whether it is using:
   - explicit-only mode,
   - diagnostics-only generated targets,
   - or a later compatibility mode.

The immediate safe mode is explicit-only solver execution plus graph summary diagnostics.

## Solver integration dry-run note

A solver-facing helper should not be introduced until its exact type boundary is agreed with the existing TypeScript configuration.

The first attempted solver helper boundary used an explicit-only selector inside `model.ts`. It was intentionally not merged because CI failed during Typecheck before Test execution. The safe conclusion is:

- keep solver execution on direct explicit `transition.to` until a smaller typed boundary is proven by CI,
- keep `selectGraphTarget()` as the graph-level target policy helper for now,
- do not add a second solver-level target policy helper without a passing Typecheck run,
- do not merge a solver-facing helper on the basis of semantic review alone.

This does not change the solver integration goal. It only adds a gate: the next solver-facing PR must first prove that the helper shape is TypeScript-compatible before changing any solver call site.

## Target policy helper

`selectGraphTarget(edge, policy)` is the code-level boundary for future solver-facing target selection.

Current behavior:

- accepted policy: `explicit_only`,
- selected target: `edge.explicitTo`,
- `edge.generatedTo` never overrides `edge.explicitTo`,
- this preserves current solver behavior and keeps generated targets diagnostic-only.

Any future policy that uses `generatedTo` must be introduced in a separate PR with tests that prove existing explicit-only behavior is unchanged.

## Minimum test cases for graph expansion

The implementation should keep tests for:

1. expanding from one seed state to multiple generated states,
2. ignoring transitions that are not outgoing from the current state,
3. deduplicating generated states,
4. retaining both `explicitTo` and `generatedTo`,
5. reporting explicit/generated mismatch without changing solver behavior,
6. stopping at a configured depth or state limit,
7. summarizing diagnostic counts and explicit/generated target match rates,
8. selecting explicit targets under the `explicit_only` policy.

## Safe PR sequence

1. Add this design document.
2. Add graph expansion types and a pure expansion helper.
3. Add bounded breadth-first expansion tests.
4. Add diagnostics for explicit/generated mismatch.
5. Add summary helpers for graph inspection.
6. Add explicit-only target policy helper.
7. Add regression tests for explicit-only solver behavior.
8. Document the v0.3 completion boundary.
9. Only after those are stable, design generated-target solver integration priority.

## Acceptance criteria before generated-target solver integration

Generated-target solver integration should not start until:

- the generated graph can be produced from seed states and transitions,
- generated states are deterministic and deduplicated,
- explicit/generated mismatches are visible in diagnostics,
- explicit/generated match rates are visible in summary output,
- explicit-only target selection is represented by `selectGraphTarget()`,
- current solver tests still pass unchanged,
- explicit-only solver target behavior is covered by regression tests,
- the next PR explicitly defines whether solver edges use `transition.to`, generated candidate ids, or a compatibility mode.
