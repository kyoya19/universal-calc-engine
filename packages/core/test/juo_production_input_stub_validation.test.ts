import { describe, expect, test } from 'vitest';
import { juoProductionInputFixtureStub, juoSourceCandidateInventory } from './fixtures/juo';

const allowedStatuses = new Set(['required', 'stub', 'deferred', 'excluded']);
const allowedStateKinds = new Set(['start', 'terminal', 'transient', 'helper']);
const allowedProbabilityValueTypes = new Set(['fraction', 'decimal', 'formula', 'placeholder']);
const allowedRewardValueTypes = new Set(['literal', 'formula', 'placeholder']);
const forbiddenProductionValueKeys = new Set([
  'value',
  'numerator',
  'denominator',
  'decimalValue',
  'decimal_value',
  'formula',
  'payout',
  'netPayout',
  'expectedCoins',
  'expectedValue',
  'probability',
  'reward'
]);
const sourcePolicyValueStatuses = new Set(['candidate', 'source_backed', 'formula_backed', 'inferred', 'accepted']);
const requiredSourceMetadataKeys = new Set(['sourceType', 'sourceTitle', 'sourceLocation', 'transcriptionStatus', 'confidenceStatus']);
const requiredProbabilityUnitMetadataKeys = new Set(['probabilityRepresentation', 'condition', 'normalizationStatus']);
const requiredRewardUnitMetadataKeys = new Set(['rewardUnit', 'accountingBoundary', 'grossOrNet']);
const sourceCandidateTypes = new Set(['primary', 'secondary', 'observed', 'inferred', 'formula', 'assumption', 'unknown', 'excluded']);

function expectUnique(values: readonly string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

function expectNoProductionValueKeys(candidate: object): void {
  for (const key of Object.keys(candidate)) {
    expect(forbiddenProductionValueKeys.has(key)).toBe(false);
  }
}

function expectNoSourcePolicyPromotionWithoutMetadata(candidate: object, requiredMetadataKeys: ReadonlySet<string>): void {
  const row = candidate as Record<string, unknown>;
  const valueStatus = row.valueStatus;

  if (typeof valueStatus !== 'string' || !sourcePolicyValueStatuses.has(valueStatus)) {
    return;
  }

  for (const key of requiredSourceMetadataKeys) {
    expect(Object.prototype.hasOwnProperty.call(row, key)).toBe(true);
  }

  for (const key of requiredMetadataKeys) {
    expect(Object.prototype.hasOwnProperty.call(row, key)).toBe(true);
  }
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

  test('rejects accidental executable production-value fields in probability and reward rows', () => {
    for (const probability of juoProductionInputFixtureStub.probabilities) {
      expectNoProductionValueKeys(probability);
      expect(Object.keys(probability).sort()).toEqual([
        'normalizationGroup',
        'probabilityId',
        'sourceNote',
        'valueStatus',
        'valueType'
      ]);
    }

    for (const reward of juoProductionInputFixtureStub.rewards) {
      expectNoProductionValueKeys(reward);
      expect(Object.keys(reward).sort()).toEqual([
        'accountingExclusions',
        'rewardId',
        'rewardUnit',
        'sourceNote',
        'valueStatus',
        'valueType'
      ]);
    }
  });

  test('rejects source-policy promotion without required citation and unit metadata', () => {
    for (const probability of juoProductionInputFixtureStub.probabilities) {
      expectNoSourcePolicyPromotionWithoutMetadata(probability, requiredProbabilityUnitMetadataKeys);
    }

    for (const reward of juoProductionInputFixtureStub.rewards) {
      expectNoSourcePolicyPromotionWithoutMetadata(reward, requiredRewardUnitMetadataKeys);
    }
  });

  test('validates non-executable source candidate inventory rows', () => {
    expect(juoSourceCandidateInventory).not.toHaveLength(0);
    expectUnique(juoSourceCandidateInventory.map((candidate) => candidate.sourceId));
    expect(new Set(juoSourceCandidateInventory.map((candidate) => candidate.sourceType))).toEqual(sourceCandidateTypes);

    for (const candidate of juoSourceCandidateInventory) {
      expect(candidate.sourceId.trim()).not.toBe('');
      expect(sourceCandidateTypes.has(candidate.sourceType)).toBe(true);
      expect(candidate.expectedCategory.trim()).not.toBe('');
      expect(candidate.expectedUnitCategory.trim()).not.toBe('');
      expect(candidate.citationStatus).toBe('unknown');
      expect(candidate.retrievalStatus).toBe('not_started');
      expect(candidate.transcriptionStatus).toBe('not_started');
      expect(['unverified', 'excluded']).toContain(candidate.confidenceStatus);
      expect(['unknown', 'not_applicable']).toContain(candidate.conflictStatus);
      expect(candidate.executionEligibility).toBe('no');
      expectNoProductionValueKeys(candidate);
    }
  });

  test('rejects accidental executable production-value fields in transitions', () => {
    for (const transition of juoProductionInputFixtureStub.transitions) {
      expectNoProductionValueKeys(transition);
      expect(Object.keys(transition).sort()).toEqual([
        'displayLabel',
        'fromStateId',
        'generatedTo',
        'generatedToStatus',
        'probabilityRef',
        'rewardRef',
        'toStateId',
        'transitionId'
      ]);
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
