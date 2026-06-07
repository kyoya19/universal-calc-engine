import {
  applyTransitionEffects,
  DefinitionModel,
  StateDefinition,
  StateId,
  StateProperties,
  TransitionDefinition
} from './model';

export type StateCandidate = {
  id: string;
  properties: StateProperties;
};

export type ExpandedStateEdge = {
  from: StateId;
  explicitTo: StateId;
  generatedTo?: StateId;
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
  stateId?: StateId;
  message: string;
};

export type ExpandedStateGraph = {
  states: StateDefinition[];
  generatedStates: StateDefinition[];
  edges: ExpandedStateEdge[];
  diagnostics: StateExpansionDiagnostic[];
};

export type StateGraphSummary = {
  stateCount: number;
  generatedStateCount: number;
  edgeCount: number;
  edgeWithGeneratedTargetCount: number;
  explicitGeneratedMatchCount: number;
  explicitGeneratedMismatchCount: number;
  explicitGeneratedMatchRate: number;
  explicitGeneratedMismatchRate: number;
  edgeWithoutGeneratedTargetCount: number;
  diagnosticCount: number;
  diagnosticCountsByType: Record<StateExpansionDiagnostic['type'], number>;
};

export type GraphTargetPolicy = 'explicit_only';

export type StateSpaceExpansionOptions = {
  maxDepth?: number;
  maxStates?: number;
};

function formatPropertyValue(value: StateProperties[string]): string {
  return String(value);
}

export function stateIdFromProperties(properties: StateProperties): string {
  const normalized = Object.entries(properties)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${formatPropertyValue(value)}`)
    .join(',');

  return `state:{${normalized}}`;
}

export function seedStatesFromModel(model: DefinitionModel): StateDefinition[] {
  const startState = model.states.find((state) => state.id === model.startState);

  if (!startState) {
    throw new Error(`Unknown start state: ${model.startState}`);
  }

  return [startState];
}

export function expandGraphFromModel(
  model: DefinitionModel,
  options: StateSpaceExpansionOptions = {}
): ExpandedStateGraph {
  return expandStateSpace(seedStatesFromModel(model), model.transitions, options);
}

export function selectGraphTarget(edge: ExpandedStateEdge, policy: GraphTargetPolicy = 'explicit_only'): StateId {
  if (policy === 'explicit_only') {
    return edge.explicitTo;
  }

  return edge.explicitTo;
}

export function summarizeStateGraph(graph: ExpandedStateGraph): StateGraphSummary {
  const diagnosticCountsByType: StateGraphSummary['diagnosticCountsByType'] = {
    missing_generated_candidate: 0,
    explicit_generated_mismatch: 0,
    duplicate_state_ignored: 0,
    depth_limit_reached: 0,
    max_states_reached: 0
  };
  let edgeWithGeneratedTargetCount = 0;
  let explicitGeneratedMatchCount = 0;
  let explicitGeneratedMismatchCount = 0;

  for (const diagnostic of graph.diagnostics) {
    diagnosticCountsByType[diagnostic.type] += 1;
  }

  for (const edge of graph.edges) {
    if (edge.generatedTo === undefined) {
      continue;
    }

    edgeWithGeneratedTargetCount += 1;

    if (edge.explicitTo === edge.generatedTo) {
      explicitGeneratedMatchCount += 1;
    } else {
      explicitGeneratedMismatchCount += 1;
    }
  }

  const explicitGeneratedMatchRate =
    edgeWithGeneratedTargetCount === 0 ? 0 : explicitGeneratedMatchCount / edgeWithGeneratedTargetCount;
  const explicitGeneratedMismatchRate =
    edgeWithGeneratedTargetCount === 0 ? 0 : explicitGeneratedMismatchCount / edgeWithGeneratedTargetCount;

  return {
    stateCount: graph.states.length,
    generatedStateCount: graph.generatedStates.length,
    edgeCount: graph.edges.length,
    edgeWithGeneratedTargetCount,
    explicitGeneratedMatchCount,
    explicitGeneratedMismatchCount,
    explicitGeneratedMatchRate,
    explicitGeneratedMismatchRate,
    edgeWithoutGeneratedTargetCount: graph.edges.length - edgeWithGeneratedTargetCount,
    diagnosticCount: graph.diagnostics.length,
    diagnosticCountsByType
  };
}

export function generateNextStateCandidate(
  currentState: StateDefinition,
  transition: TransitionDefinition
): StateCandidate {
  const properties = applyTransitionEffects(currentState.properties, transition.effects);

  return {
    id: stateIdFromProperties(properties),
    properties
  };
}

export function generateNextStateCandidates(
  currentState: StateDefinition,
  transitions: TransitionDefinition[]
): StateCandidate[] {
  return uniqueStateCandidates(
    transitions.map((transition) => generateNextStateCandidate(currentState, transition))
  );
}

export function expandOneStateStep(
  state: StateDefinition,
  transitions: TransitionDefinition[]
): StateCandidate[] {
  const outgoingTransitions = transitions.filter((transition) => transition.from === state.id);
  return generateNextStateCandidates(state, outgoingTransitions);
}

export function expandStateSpace(
  seedStates: StateDefinition[],
  transitions: TransitionDefinition[],
  options: StateSpaceExpansionOptions = {}
): ExpandedStateGraph {
  const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;
  const maxStates = options.maxStates ?? Number.POSITIVE_INFINITY;
  const stateById = new Map<StateId, StateDefinition>();
  const generatedStateIds = new Set<StateId>();
  const edges: ExpandedStateEdge[] = [];
  const diagnostics: StateExpansionDiagnostic[] = [];
  const queue: Array<{ state: StateDefinition; depth: number }> = [];

  for (const state of seedStates) {
    if (!stateById.has(state.id)) {
      stateById.set(state.id, state);
      queue.push({ state, depth: 0 });
    }
  }

  for (let index = 0; index < queue.length; index += 1) {
    const { state, depth } = queue[index]!;

    if (depth >= maxDepth) {
      diagnostics.push({
        type: 'depth_limit_reached',
        stateId: state.id,
        message: `Depth limit reached at state: ${state.id}`
      });
      continue;
    }

    const outgoingTransitions = transitions.filter((transition) => transition.from === state.id);

    for (const transition of outgoingTransitions) {
      const edge: ExpandedStateEdge = {
        from: state.id,
        explicitTo: transition.to,
        transition
      };

      if (!transition.effects || transition.effects.length === 0) {
        diagnostics.push({
          type: 'missing_generated_candidate',
          transition,
          stateId: state.id,
          message: `Transition from ${transition.from} to ${transition.to} has no effects[] candidate`
        });
        edges.push(edge);
        continue;
      }

      const candidate = generateNextStateCandidate(state, transition);
      edge.generatedTo = candidate.id;
      edges.push(edge);

      if (transition.to !== candidate.id) {
        diagnostics.push({
          type: 'explicit_generated_mismatch',
          transition,
          stateId: state.id,
          message: `Explicit target ${transition.to} differs from generated target ${candidate.id}`
        });
      }

      if (stateById.has(candidate.id)) {
        diagnostics.push({
          type: 'duplicate_state_ignored',
          transition,
          stateId: candidate.id,
          message: `Generated state already exists: ${candidate.id}`
        });
        continue;
      }

      if (stateById.size >= maxStates) {
        diagnostics.push({
          type: 'max_states_reached',
          transition,
          stateId: candidate.id,
          message: `Max states reached before adding generated state: ${candidate.id}`
        });
        continue;
      }

      const generatedState: StateDefinition = {
        id: candidate.id,
        properties: candidate.properties
      };

      stateById.set(generatedState.id, generatedState);
      generatedStateIds.add(generatedState.id);
      queue.push({ state: generatedState, depth: depth + 1 });
    }
  }

  const states = Array.from(stateById.values()).sort((left, right) => left.id.localeCompare(right.id));
  const generatedStates = states.filter((state) => generatedStateIds.has(state.id));

  return {
    states,
    generatedStates,
    edges,
    diagnostics
  };
}

export function uniqueStateCandidates(candidates: StateCandidate[]): StateCandidate[] {
  const seen = new Set<string>();
  const unique: StateCandidate[] = [];

  for (const candidate of candidates) {
    if (!seen.has(candidate.id)) {
      seen.add(candidate.id);
      unique.push(candidate);
    }
  }

  return unique.sort((left, right) => left.id.localeCompare(right.id));
}
