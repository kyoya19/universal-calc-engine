import {
  DefinitionModel,
  ExpectedElapsedTimeResult,
  ReachabilityResult,
  StateId
} from './model';

function numberMapToRecord(map: Map<StateId, number>): Record<StateId, number> {
  const record: Record<StateId, number> = {};
  for (const [stateId, value] of map) {
    record[stateId] = value;
  }
  return record;
}

export function toForwardElapsedTimeOutput(
  model: DefinitionModel,
  result: ExpectedElapsedTimeResult
): {
  startState: StateId;
  expectedElapsedTimeSeconds: number;
  expectedElapsedTimeSecondsByState: Record<StateId, number>;
} {
  return {
    startState: model.startState,
    expectedElapsedTimeSeconds:
      result.expectedElapsedTimeSecondsByState.get(model.startState) ?? 0,
    expectedElapsedTimeSecondsByState: numberMapToRecord(
      result.expectedElapsedTimeSecondsByState
    )
  };
}

export function toForwardReachabilityOutput(
  model: DefinitionModel,
  result: ReachabilityResult
): {
  targetStates: StateId[];
  probabilityFromStart: number;
  probabilityByState: Record<StateId, number>;
} {
  return {
    targetStates: [...result.targetStates],
    probabilityFromStart:
      result.reachabilityProbabilityByState.get(model.startState) ?? 0,
    probabilityByState: numberMapToRecord(result.reachabilityProbabilityByState)
  };
}
