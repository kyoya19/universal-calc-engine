import { ContributionResult, OutputResult, StateId } from './model';

export function escapeTexText(value: string): string {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return Number.parseFloat(value.toFixed(12)).toString();
}

function stateLabel(stateId: StateId): string {
  return `\\mathrm{${escapeTexText(stateId)}}`;
}

export function outputResultToTex(result: OutputResult): string {
  const rows = Object.entries(result.expectedRewardByState)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([stateId, expectedReward]) => `${stateLabel(stateId)} & ${formatNumber(expectedReward)} \\\\`)
    .join('\n');

  return [
    '\\begin{aligned}',
    `E[${stateLabel(result.startState)}] &= ${formatNumber(result.expectedReward)} \\\\`,
    '\\end{aligned}',
    '',
    '\\begin{array}{c|r}',
    '\\text{state} & \\text{expected reward} \\\\',
    '\\hline',
    rows,
    '\\end{array}'
  ].join('\n');
}

export function contributionResultToTex(result: ContributionResult): string {
  const rows = Object.entries(result.transitionContributionsByState)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([fromStateId, contributions]) =>
      contributions.map((entry) =>
        `${stateLabel(fromStateId)} & ${stateLabel(entry.to)} & ${formatNumber(entry.probability)} & ${formatNumber(entry.reward)} & ${formatNumber(entry.downstreamExpectedReward)} & ${formatNumber(entry.contribution)} \\\\`
      )
    )
    .join('\n');

  return [
    '\\begin{array}{c|c|r|r|r|r}',
    '\\text{from} & \\text{to} & p & r & E[\\text{to}] & \\text{contribution} \\\\',
    '\\hline',
    rows,
    '\\end{array}'
  ].join('\n');
}
