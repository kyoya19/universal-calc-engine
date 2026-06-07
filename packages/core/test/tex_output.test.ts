import { describe, expect, test } from 'vitest';
import {
  ContributionResult,
  OutputResult,
  contributionResultToTex,
  escapeTexText,
  outputResultToTex,
  outputResultToValueFunctionTex
} from '../src';

const outputResult: OutputResult = {
  startState: 'pos_0',
  expectedReward: 2.25,
  expectedRewardByState: {
    pos_0: 2.25,
    pos_1: 1.5,
    pos_2: 1,
    pos_3: 0
  }
};

const contributionResult: ContributionResult = {
  transitionContributionsByState: {
    pos_0: [
      {
        to: 'pos_1',
        probability: 0.5,
        reward: 1,
        downstreamExpectedReward: 1.5,
        contribution: 1.25
      },
      {
        to: 'pos_2',
        probability: 0.5,
        reward: 1,
        downstreamExpectedReward: 1,
        contribution: 1
      }
    ]
  }
};

describe('TeX output helpers', () => {
  test('escapes TeX-sensitive text', () => {
    expect(escapeTexText('pos_0%')).toBe('pos\\_0\\%');
  });

  test('converts OutputResult to TeX', () => {
    const tex = outputResultToTex(outputResult);

    expect(tex).toContain('E[\\mathrm{pos\\_0}] &= 2.25');
    expect(tex).toContain('\\mathrm{pos\\_1} & 1.5');
    expect(tex).toContain('\\begin{array}{c|r}');
  });

  test('converts OutputResult to value-function TeX', () => {
    const tex = outputResultToValueFunctionTex(outputResult);

    expect(tex).toContain('V(\\mathrm{pos\\_0}) &= 2.25');
    expect(tex).toContain('V(\\mathrm{pos\\_1}) &= 1.5');
    expect(tex).toContain('V(\\mathrm{pos\\_2}) &= 1');
    expect(tex).toContain('V(\\mathrm{pos\\_3}) &= 0');
  });

  test('converts ContributionResult to TeX', () => {
    const tex = contributionResultToTex(contributionResult);

    expect(tex).toContain('\\begin{array}{c|c|r|r|r|r}');
    expect(tex).toContain('\\mathrm{pos\\_0} & \\mathrm{pos\\_1} & 0.5 & 1 & 1.5 & 1.25');
    expect(tex).toContain('\\mathrm{pos\\_0} & \\mathrm{pos\\_2} & 0.5 & 1 & 1 & 1');
  });
});
