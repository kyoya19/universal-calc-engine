import { describe, expect, test } from 'vitest';
import { juoProductionInputFixtureStub } from './fixtures/juo';

const allowedStatuses = new Set(['required', 'stub', 'deferred', 'excluded']);
const allowedStateKinds = new Set(['start', 'terminal', 'transient', 'helper']);
const allowedProbabilityValueTypes = new Set(['fraction', 'decimal', 'formula', 'placeholder']);
const allowedRewardValueTypes = new Set(['literal', 'formula', 'placeholder']);

function expectUnique(values: readonly string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

describe('Juo production input stub validation', () => {
  test('validates requirement gate statuses and required text fields', () => {
    for (const requirement of juoProductionInputFixtureStub.fieldRequirements) {
      expect(allowedStatuses.has(requirement.status)).toBe(true);
      expect(requirement.field.trim()).not.toBe('');
      expect(requirement.requirement.trim()).not.toBe('');
    }

    expectUnique(juoProductionInputFixtureStub.fieldRequirements.map((requirement) => requirement.field));
  });

  test('validates state identity shape and start / terminal cardinality', () => {
    expect(juoProductionInputFixtureStub.states).not.toHaveLength(0);
    expectUnique(juoProductionInputFixtureStub.states.map((state) => state.stateId));

    for (const state of juoProductionInputFixtureStub.states) {
      expect(state.stateId.trim()).not.toBe('');
      expect(state.displayLabel.trim()).not.toBe('');
      expect(allowedStateKinds.has(state.stateKind)).toBe(true);
      expect(state.description.trim()).not.toBe('');
      expect(allowedStatuses.has(state.ambiguityNoteStatus)).toBe(true);
      expect(state.ambiguityNote.trim()).not.toBe('');
      expect(state.isStart).toBe(state.stateKind === 'start');
      expect(state.isTerminal).toBe(state.stateKind === 'terminal');
    }

    expect(juoProductionInputFixtureStub.states.filter((state) => state.isStart)).toHaveLength(1);
    expect(juoProductionInputFixtureStub.states.filter((state) => state.isTerminal)).toHaveLength(1);
  });

  test('validates transition references against state, probability, and reward rows', () => {
    const stateIds = new Set(juoProductionInputFixtureStub.states.map((state) => state.stateId));
    const probabilityIds = new Set(juoProductionInputFixtureStub.probabilities.map((probability) => probability.probabilityId));
    const rewardIds = new Set(juoProductionInputFixtureStub.rewards.map((reward) => reward.rewardId));

    expectUnique(juoProductionInputFixtureStub.transitions.map((transition) => transition.transitionId));

    for (const transition of juoProductionInputFixtureStub.transitions) {
      expect(transition.transitionId.trim()).not.toBe('');
      expect(stateIds.has(transition.fromStateId)).toBe(true);
      expect(stateIds.has(transition.toStateId)).toBe(true);
      expect(transition.displayLabel.trim()).not.toBe('');
      expect(probabilityIds.has(transition.probabilityRef)).toBe(true);
      expect(rewardIds.has(transition.rewardRef)).toBe(true);
      expect(transition.generatedToStatus).toBe('deferred');
      expect(transition.generatedTo).toBeNull();
    }
  });

  test('validates placeholder probability rows without real production values', () => {
    expect(juoProductionInputFixtureStub.probabilities).not.toHaveLength(0);
    expectUnique(juoProductionInputFixtureStub.probabilities.map((probability) => probability.probabilityId));

    for (const probability of juoProductionInputFixtureStub.probabilities) {
      expect(probability.probabilityId.trim()).not.toBe('');
      expect(allowedProbabilityValueTypes.has(probability.valueType)).toBe(true);
      expect(probability.valueType).toBe('placeholder');
      expect(probability.valueStatus).toBe('stub');
      expect(probability.sourceNote).toContain('Unresolved placeholder');
      expect(probability.sourceNote).toContain('no real Beast King / Juo probability value');
      expect(probability.normalizationGroup.trim()).not.toBe('');
    }
  });

  test('validates placeholder reward rows without real production values', () => {
    expect(juoProductionInputFixtureStub.rewards).not.toHaveLength(0);
    expectUnique(juoProductionInputFixtureStub.rewards.map((reward) => reward.rewardId));

    for (const reward of juoProductionInputFixtureStub.rewards) {
      expect(reward.rewardId.trim()).not.toBe('');
      expect(reward.rewardUnit.trim()).not.toBe('');
      expect(allowedRewardValueTypes.has(reward.valueType)).toBe(true);
      expect(reward.valueType).toBe('placeholder');
      expect(reward.valueStatus).toBe('stub');
      expect(reward.sourceNote).toContain('Unresolved placeholder');
      expect(reward.sourceNote).toContain('no real Beast King / Juo reward value');
      expect(reward.accountingExclusions).toEqual(['time', 'exchange_rate', 'cost']);
    }
  });

  test('validates generic target semantics and report identity remain unchanged', () => {
    expect(juoProductionInputFixtureStub.targetSemantics.solverTarget).toBe('transition.to');
    expect(juoProductionInputFixtureStub.targetSemantics.contributionTarget).toBe('transition.to');
    expect(juoProductionInputFixtureStub.targetSemantics.generatedToStatus).toBe('deferred');
    expect(juoProductionInputFixtureStub.targetSemantics.runtimeTargetSubstitutionStatus).toBe('excluded');

    expect(juoProductionInputFixtureStub.reportIdentity.kind).toBe('generated_target_comparison');
    expect(juoProductionInputFixtureStub.reportIdentity.title).toBe('Generated Target Comparison Report');
    expect(juoProductionInputFixtureStub.reportIdentity.sections).toEqual(['summary', 'rows']);
    expect(juoProductionInputFixtureStub.reportIdentity.juoSpecificAdapterStatus).toBe('deferred');
    expect(juoProductionInputFixtureStub.reportIdentity.juoSpecificRowsStatus).toBe('deferred');
    expect(juoProductionInputFixtureStub.reportIdentity.formatterBranchStatus).toBe('deferred');
  });
});
