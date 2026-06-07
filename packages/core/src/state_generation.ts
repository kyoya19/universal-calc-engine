import {
  applyTransitionEffects,
  StateDefinition,
  StateProperties,
  TransitionDefinition
} from './model';

export type StateCandidate = {
  id: string;
  properties: StateProperties;
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
