import {
  DefinitionModel,
  ExpectedElapsedTimeResult,
  SolvedModel,
  StateId
} from './model';

export type RewardRateKind = 'ratio_of_expectations';

export type RewardRateResult = {
  startState: StateId;
  expectedReward: number;
  expectedElapsedTimeSeconds: number;
  rewardPerSecond: number | null;
  rewardPerHour: number | null;
  rateKind: RewardRateKind;
};

export function toRewardRateResult(
  model: DefinitionModel,
  rewardResult: SolvedModel,
  elapsedTimeResult: ExpectedElapsedTimeResult
): RewardRateResult {
  const expectedReward = rewardResult.expectedRewardByState.get(model.startState) ?? 0;
  const expectedElapsedTimeSeconds =
    elapsedTimeResult.expectedElapsedTimeSecondsByState.get(model.startState) ?? 0;

  if (!Number.isFinite(expectedElapsedTimeSeconds) || expectedElapsedTimeSeconds < 0) {
    throw new Error(
      `Expected elapsed time for ${model.startState} must be a finite non-negative number`
    );
  }

  const rewardPerSecond =
    expectedElapsedTimeSeconds === 0 ? null : expectedReward / expectedElapsedTimeSeconds;

  return {
    startState: model.startState,
    expectedReward,
    expectedElapsedTimeSeconds,
    rewardPerSecond,
    rewardPerHour: rewardPerSecond === null ? null : rewardPerSecond * 3_600,
    rateKind: 'ratio_of_expectations'
  };
}
