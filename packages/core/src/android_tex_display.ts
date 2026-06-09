import { OutputResult, StateId } from './model';
import { escapeTexText } from './tex';

export type ValueFunctionDisplayRow = {
  stateId: StateId;
  value: number;
  plainText: string;
  tex: string;
  isStartState: boolean;
};

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return Number.parseFloat(value.toFixed(12)).toString();
}

function stateLabel(stateId: StateId): string {
  return `\\mathrm{${escapeTexText(stateId)}}`;
}

function valueFunctionTex(stateId: StateId): string {
  return `V(${stateLabel(stateId)})`;
}

function valueFunctionPlainText(stateId: StateId): string {
  return `V(${stateId})`;
}

export function outputResultToValueFunctionDisplayRows(result: OutputResult): ValueFunctionDisplayRow[] {
  const sortedRows = Object.entries(result.expectedRewardByState).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  const startRow: Array<[StateId, number]> = [[result.startState, result.expectedReward]];
  const remainingRows = sortedRows.filter(([stateId]) => stateId !== result.startState);

  return [...startRow, ...remainingRows].map(([stateId, value]) => ({
    stateId,
    value,
    plainText: `${valueFunctionPlainText(stateId)} = ${formatNumber(value)}`,
    tex: `${valueFunctionTex(stateId)} &= ${formatNumber(value)}`,
    isStartState: stateId === result.startState
  }));
}
