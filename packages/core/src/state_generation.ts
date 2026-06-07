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
