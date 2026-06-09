import { describe, expect, test } from 'vitest';
import { evaluateModel, expandModel, isTerminalState, solveExpectedReward, toOutputResult } from '../src';
import { juoPocAssumptions, juoPocSeedModel, juoPocUnknowns, juoStateId } from './fixtures/juo';

describe('Juo PoC fixture stub', () => {
  test('solves the placeholder fixture through the generic expected reward pipeline', () => {
    const expanded = expandModel(juoPocSeedModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(juoPocSeedModel, solved);

    expect(output.startState).toBe(juoStateId('start'));
    expect(output.expectedReward).toBe(0);
    expect(output.expectedRewardByState[juoStateId('start')]).toBe(0);
    expect(output.expectedRewardByState[juoStateId('placeholder_terminal')]).toBe(0);
  });

  test('keeps the placeholder fixture structure intentionally minimal', () => {
    expect(juoPocSeedModel.startState).toBe(juoStateId('start'));
    expect(juoPocSeedModel.states.map((state) => state.id)).toEqual([
      juoStateId('start'),
      juoStateId('placeholder_terminal')
    ]);
    expect(juoPocSeedModel.transitions).toHaveLength(1);

    const transition = juoPocSeedModel.transitions[0]!;
    expect(transition).toMatchObject({
      from: juoStateId('start'),
      to: juoStateId('placeholder_terminal'),
      probability: 1,
      reward: 0,
      effects: [{ type: 'set_property', property: 'stage', value: 'placeholder_terminal' }]
    });

    const terminalState = juoPocSeedModel.states.find((state) => state.id === juoStateId('placeholder_terminal'));
    expect(terminalState).toBeDefined();
    expect(isTerminalState(terminalState!)).toBe(true);
  });

  test('keeps placeholder assumptions explicit and machine-specific inputs unresolved', () => {
    expect(juoPocAssumptions).toContain('This fixture is a machine-specific PoC stub only.');
    expect(juoPocAssumptions).toContain(
      'Transition probabilities are placeholders and must not be treated as production values.'
    );
    expect(juoPocAssumptions).toContain('Rewards are placeholders and must not be treated as production values.');
    expect(juoPocUnknowns).toContain('Machine-specific probability values');
    expect(juoPocUnknowns).toContain('Machine-specific reward values');
    expect(juoPocUnknowns).toContain('Machine-specific expected values');
  });
});
