import { describe, expect, test } from 'vitest';
import { evaluateModel, expandModel, isTerminalState, solveExpectedReward, toOutputResult } from '../src';
import {
  juoPocAssumptions,
  juoPocNamedStages,
  juoPocNamedStateModel,
  juoPocSeedModel,
  juoPocUnknowns,
  juoStateId
} from './fixtures/juo';

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

  test('keeps the named-state fixture separate from the minimal placeholder fixture', () => {
    expect([...juoPocNamedStages]).toEqual(['start', 'normal', 'chance', 'bonus', 'terminal']);
    expect(juoPocNamedStateModel.startState).toBe(juoStateId('start'));
    expect(juoPocNamedStateModel.states.map((state) => state.id)).toEqual(
      juoPocNamedStages.map((stage) => juoStateId(stage))
    );
    expect(juoPocSeedModel.states.map((state) => state.id)).toEqual([
      juoStateId('start'),
      juoStateId('placeholder_terminal')
    ]);
  });

  test('keeps the named-state fixture placeholder-only while preserving solver target semantics', () => {
    expect(juoPocNamedStateModel.transitions).toEqual([
      {
        from: juoStateId('start'),
        to: juoStateId('normal'),
        probability: 1,
        reward: 0,
        effects: [{ type: 'set_property', property: 'stage', value: 'normal' }]
      },
      {
        from: juoStateId('normal'),
        to: juoStateId('chance'),
        probability: 1,
        reward: 0,
        effects: [{ type: 'set_property', property: 'stage', value: 'chance' }]
      },
      {
        from: juoStateId('chance'),
        to: juoStateId('bonus'),
        probability: 1,
        reward: 0,
        effects: [{ type: 'set_property', property: 'stage', value: 'bonus' }]
      },
      {
        from: juoStateId('bonus'),
        to: juoStateId('terminal'),
        probability: 1,
        reward: 0,
        effects: [{ type: 'set_property', property: 'stage', value: 'terminal' }]
      }
    ]);

    const terminalState = juoPocNamedStateModel.states.find((state) => state.id === juoStateId('terminal'));
    expect(terminalState).toBeDefined();
    expect(isTerminalState(terminalState!)).toBe(true);
  });

  test('solves the named-state fixture through the generic expected reward pipeline as zero placeholder reward', () => {
    const expanded = expandModel(juoPocNamedStateModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(juoPocNamedStateModel, solved);

    expect(output.startState).toBe(juoStateId('start'));
    expect(output.expectedReward).toBe(0);
    expect(Object.keys(output.expectedRewardByState).sort()).toEqual(
      juoPocNamedStages.map((stage) => juoStateId(stage)).sort()
    );
    for (const stage of juoPocNamedStages) {
      expect(output.expectedRewardByState[juoStateId(stage)]).toBe(0);
    }
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

  test('keeps metadata complete enough to block accidental production interpretation', () => {
    expect([...juoPocAssumptions]).toEqual([
      'This fixture is a machine-specific PoC stub only.',
      'State labels are placeholders until confirmed Juo inputs are available.',
      'Transition probabilities are placeholders and must not be treated as production values.',
      'Rewards are placeholders and must not be treated as production values.'
    ]);
    expect([...juoPocUnknowns]).toEqual([
      'Machine-specific state list',
      'Machine-specific terminal conditions',
      'Machine-specific transition graph',
      'Machine-specific probability values',
      'Machine-specific reward values',
      'Machine-specific validation rules',
      'Machine-specific expected report rows',
      'Machine-specific expected values'
    ]);
  });
});