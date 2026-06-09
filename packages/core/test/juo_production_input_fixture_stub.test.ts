import { describe, expect, test } from 'vitest';
import { juoProductionInputFixtureStub, juoStateId } from './fixtures/juo';

describe('Juo production input fixture stub', () => {
  test('keeps the machine scope explicit and placeholder-only', () => {
    expect(juoProductionInputFixtureStub.machineScope).toEqual({
      machineId: 'juo',
      machineDisplayName: 'Beast King / Juo',
      scopeStatement: 'Production-input fixture stub only; real machine routes are not modeled yet.',
      includedRoutes: ['placeholder_start_to_terminal_route'],
      excludedRoutes: ['real_bonus_routes', 'real_mode_routes', 'real_payout_routes'],
      knownStubs: ['state_table', 'transition_table', 'probability_table', 'reward_table']
    });
  });

  test('marks every requirements status with an allowed v4.2 gate status', () => {
    const allowedStatuses = new Set(['required', 'stub', 'deferred', 'excluded']);

    for (const requirement of juoProductionInputFixtureStub.fieldRequirements) {
      expect(allowedStatuses.has(requirement.status)).toBe(true);
      expect(requirement.field).not.toBe('');
      expect(requirement.requirement).not.toBe('');
    }

    expect(juoProductionInputFixtureStub.fieldRequirements.map((requirement) => requirement.status).sort()).toEqual([
      'deferred',
      'excluded',
      'required',
      'required',
      'stub'
    ]);
  });

  test('keeps the fixture stub to one explicit start and one explicit terminal state', () => {
    expect(juoProductionInputFixtureStub.states).toHaveLength(2);
    expect(juoProductionInputFixtureStub.states.filter((state) => state.isStart)).toHaveLength(1);
    expect(juoProductionInputFixtureStub.states.filter((state) => state.isTerminal)).toHaveLength(1);
    expect(juoProductionInputFixtureStub.states.map((state) => state.stateId)).toEqual([
      juoStateId('production_stub_start'),
      juoStateId('production_stub_terminal')
    ]);
    expect(juoProductionInputFixtureStub.states.map((state) => state.ambiguityNoteStatus)).toEqual(['stub', 'stub']);
  });

  test('keeps transitions fixture-only and connected to placeholder probability and reward rows', () => {
    expect(juoProductionInputFixtureStub.transitions).toEqual([
      {
        transitionId: 'juo_production_stub_start_to_terminal',
        fromStateId: juoStateId('production_stub_start'),
        toStateId: juoStateId('production_stub_terminal'),
        displayLabel: 'Production stub unresolved transition',
        probabilityRef: 'juo_probability_placeholder_unresolved',
        rewardRef: 'juo_reward_placeholder_unresolved',
        generatedToStatus: 'deferred',
        generatedTo: null
      }
    ]);

    expect(juoProductionInputFixtureStub.probabilities.map((probability) => probability.probabilityId)).toContain(
      juoProductionInputFixtureStub.transitions[0]!.probabilityRef
    );
    expect(juoProductionInputFixtureStub.rewards.map((reward) => reward.rewardId)).toContain(
      juoProductionInputFixtureStub.transitions[0]!.rewardRef
    );
  });

  test('does not insert real production probability or reward values', () => {
    expect(juoProductionInputFixtureStub.probabilities).toEqual([
      {
        probabilityId: 'juo_probability_placeholder_unresolved',
        valueType: 'placeholder',
        valueStatus: 'stub',
        sourceNote: 'Unresolved placeholder; no real Beast King / Juo probability value has been inserted.',
        normalizationGroup: 'juo_production_stub_start_outgoing'
      }
    ]);

    expect(juoProductionInputFixtureStub.rewards).toEqual([
      {
        rewardId: 'juo_reward_placeholder_unresolved',
        rewardUnit: 'placeholder_reward_unit',
        valueType: 'placeholder',
        valueStatus: 'stub',
        sourceNote: 'Unresolved placeholder; no real Beast King / Juo reward value has been inserted.',
        accountingExclusions: ['time', 'exchange_rate', 'cost']
      }
    ]);
  });

  test('preserves generic target semantics and generic report identity', () => {
    expect(juoProductionInputFixtureStub.targetSemantics).toEqual({
      solverTarget: 'transition.to',
      contributionTarget: 'transition.to',
      generatedToStatus: 'deferred',
      runtimeTargetSubstitutionStatus: 'excluded'
    });

    expect(juoProductionInputFixtureStub.reportIdentity).toEqual({
      kind: 'generated_target_comparison',
      title: 'Generated Target Comparison Report',
      sections: ['summary', 'rows'],
      juoSpecificAdapterStatus: 'deferred',
      juoSpecificRowsStatus: 'deferred',
      formatterBranchStatus: 'deferred'
    });
  });
});
