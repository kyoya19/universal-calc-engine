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

  test('keeps named-state metadata aligned with declared placeholder stages', () => {
    for (const stage of juoPocNamedStages) {
      const state = juoPocNamedStateModel.states.find((candidate) => candidate.id === juoStateId(stage));

      expect(state).toBeDefined();
      expect(state).toMatchObject({
        id: juoStateId(stage),
        properties: { machine: 'juo', stage }
      });
    }
  });

  test('keeps named-state transition effects aligned with transition targets', () => {
    for (const transition of juoPocNamedStateModel.transitions) {
      const targetStage = juoPocNamedStages.find((stage) => juoStateId(stage) === transition.to);

      expect(targetStage).toBeDefined();
      expect(transition.effects).toEqual([{ type: 'set_property', property: 'stage', value: targetStage }]);
    }
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

  test('keeps named-state references closed over the placeholder state set', () => {
    const stateIds = new Set(juoPocNamedStateModel.states.map((state) => state.id));
    const stageIds = new Set(juoPocNamedStages.map((stage) => juoStateId(stage)));

    expect(stateIds).toEqual(stageIds);
    expect(stateIds.size).toBe(juoPocNamedStages.length);

    for (const transition of juoPocNamedStateModel.transitions) {
      expect(stateIds.has(transition.from)).toBe(true);
      expect(stateIds.has(transition.to)).toBe(true);
    }
  });

  test('keeps the named-state graph as a single placeholder path without branches', () => {
    const outgoingCounts = new Map<string, number>();
    const incomingCounts = new Map<string, number>();

    for (const transition of juoPocNamedStateModel.transitions) {
      outgoingCounts.set(transition.from, (outgoingCounts.get(transition.from) ?? 0) + 1);
      incomingCounts.set(transition.to, (incomingCounts.get(transition.to) ?? 0) + 1);
    }

    expect(juoPocNamedStateModel.transitions).toHaveLength(juoPocNamedStages.length - 1);
    expect(outgoingCounts.get(juoStateId('terminal')) ?? 0).toBe(0);
    expect(incomingCounts.get(juoStateId('start')) ?? 0).toBe(0);

    for (const stage of juoPocNamedStages.filter((candidate) => candidate !== 'terminal')) {
      expect(outgoingCounts.get(juoStateId(stage))).toBe(1);
    }
    for (const stage of juoPocNamedStages.filter((candidate) => candidate !== 'start')) {
      expect(incomingCounts.get(juoStateId(stage))).toBe(1);
    }
  });

  test('keeps the named-state graph acyclic in declared placeholder order', () => {
    const stageOrder = new Map(juoPocNamedStages.map((stage, index) => [juoStateId(stage), index]));

    for (const transition of juoPocNamedStateModel.transitions) {
      expect(stageOrder.get(transition.to)).toBe((stageOrder.get(transition.from) ?? -1) + 1);
    }
  });

  test('keeps exactly one named-state terminal and no outgoing terminal transitions', () => {
    const terminalStates = juoPocNamedStateModel.states.filter((state) => isTerminalState(state));

    expect(terminalStates.map((state) => state.id)).toEqual([juoStateId('terminal')]);
    expect(juoPocNamedStateModel.transitions.some((transition) => transition.from === juoStateId('terminal'))).toBe(false);
    expect(juoPocNamedStateModel.transitions.some((transition) => transition.to === juoStateId('terminal'))).toBe(true);
  });

  test('keeps all named-state transitions as placeholder probability and reward values', () => {
    expect(
      juoPocNamedStateModel.transitions.every((transition) => transition.probability === 1 && transition.reward === 0)
    ).toBe(true);
  });

  test('keeps all named-state transitions free of generated target substitution data', () => {
    for (const transition of juoPocNamedStateModel.transitions) {
      expect('generatedTo' in transition).toBe(false);
    }
  });

  test('keeps named-state fixture aligned with unresolved production metadata', () => {
    expect(juoPocAssumptions).toContain('State labels are placeholders until confirmed Juo inputs are available.');
    expect(juoPocUnknowns).toContain('Machine-specific state list');
    expect(juoPocUnknowns).toContain('Machine-specific transition graph');
    expect(juoPocUnknowns).toContain('Machine-specific terminal conditions');

    expect(juoPocNamedStateModel.states.map((state) => state.id)).toEqual(
      juoPocNamedStages.map((stage) => juoStateId(stage))
    );
  });

  test('keeps named-state fixture aligned with unresolved production values', () => {
    expect(juoPocAssumptions).toContain(
      'Transition probabilities are placeholders and must not be treated as production values.'
    );
    expect(juoPocAssumptions).toContain('Rewards are placeholders and must not be treated as production values.');
    expect(juoPocUnknowns).toContain('Machine-specific probability values');
    expect(juoPocUnknowns).toContain('Machine-specific reward values');
    expect(juoPocUnknowns).toContain('Machine-specific expected values');

    expect(juoPocNamedStateModel.transitions.every((transition) => transition.probability === 1)).toBe(true);
    expect(juoPocNamedStateModel.transitions.every((transition) => transition.reward === 0)).toBe(true);
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

  test('keeps named-state generic output shape fixed to the placeholder state set', () => {
    const expanded = expandModel(juoPocNamedStateModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(juoPocNamedStateModel, solved);
    const expectedStateIds = juoPocNamedStages.map((stage) => juoStateId(stage));

    expect(Object.keys(output).sort()).toEqual(['expectedReward', 'expectedRewardByState', 'startState']);
    expect(output.startState).toBe(juoPocNamedStateModel.startState);
    expect(output.expectedReward).toBe(0);
    expect(Object.keys(output.expectedRewardByState).sort()).toEqual([...expectedStateIds].sort());
    expect(output.expectedRewardByState).toEqual(
      Object.fromEntries(expectedStateIds.map((stateId) => [stateId, 0]))
    );
  });

  test('keeps named-state reporting readiness metadata unresolved without report wiring', () => {
    expect(juoPocAssumptions).toContain('This fixture is a machine-specific PoC stub only.');
    expect(juoPocUnknowns).toContain('Machine-specific validation rules');
    expect(juoPocUnknowns).toContain('Machine-specific expected report rows');

    expect(juoPocNamedStateModel.states.map((state) => Object.keys(state.properties ?? {}).sort())).toEqual(
      juoPocNamedStages.map(() => ['machine', 'stage'])
    );
    expect(juoPocNamedStateModel.transitions.map((transition) => Object.keys(transition).sort())).toEqual(
      juoPocNamedStateModel.transitions.map(() => ['effects', 'from', 'probability', 'reward', 'to'])
    );
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
