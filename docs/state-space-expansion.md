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

Recommended minimal output shape:

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
  type: 'missing_generated_candidate' | 'explicit_generated_mismatch' | 'duplicate_state_ignored' | 'depth_limit_reached';
  transition?: TransitionDefinition;
  stateId?: string;
  message: string;
};
```

These names are design-level names. The implementation may rename them if the final names are clearer and tests preserve the semantics.

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

## Minimum test cases for graph expansion

The first implementation PR should add tests for:

1. expanding from one seed state to multiple generated states,
2. ignoring transitions that are not outgoing from the current state,
3. deduplicating generated states,
4. retaining both `explicitTo` and `generatedTo`,
5. reporting explicit/generated mismatch without changing solver behavior,
6. stopping at a configured depth or state limit.

## Safe PR sequence

1. Add this design document.
2. Add graph expansion types and a pure expansion helper.
3. Add bounded breadth-first expansion tests.
4. Add diagnostics for explicit/generated mismatch.
5. Only after those are stable, design solver integration priority.

## Acceptance criteria before solver integration

Solver integration should not start until:

- the generated graph can be produced from seed states and transitions,
- generated states are deterministic and deduplicated,
- explicit/generated mismatches are visible in diagnostics,
- current solver tests still pass unchanged,
- the next PR explicitly defines whether solver edges use `transition.to`, generated candidate ids, or a compatibility mode.
