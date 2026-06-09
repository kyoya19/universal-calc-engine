import { type DefinitionModel, stateIdFromProperties } from '../../src';

export function juoStateId(stage: string): string {
  return stateIdFromProperties({ machine: 'juo', stage });
}

export const juoPocNamedStages = ['start', 'normal', 'chance', 'bonus', 'terminal'] as const;

export const juoPocAssumptions = [
  'This fixture is a machine-specific PoC stub only.',
  'State labels are placeholders until confirmed Juo inputs are available.',
  'Transition probabilities are placeholders and must not be treated as production values.',
  'Rewards are placeholders and must not be treated as production values.'
] as const;

export const juoPocUnknowns = [
  'Machine-specific state list',
  'Machine-specific terminal conditions',
  'Machine-specific transition graph',
  'Machine-specific probability values',
  'Machine-specific reward values',
  'Machine-specific validation rules',
  'Machine-specific expected report rows',
  'Machine-specific expected values'
] as const;

export const juoPocSeedModel: DefinitionModel = {
  startState: juoStateId('start'),
  states: [
    { id: juoStateId('start'), properties: { machine: 'juo', stage: 'start' } },
    {
      id: juoStateId('placeholder_terminal'),
      properties: { machine: 'juo', stage: 'placeholder_terminal' },
      terminalCondition: { type: 'property_equals', property: 'stage', value: 'placeholder_terminal' }
    }
  ],
  transitions: [
    {
      from: juoStateId('start'),
      to: juoStateId('placeholder_terminal'),
      probability: 1,
      reward: 0,
      effects: [{ type: 'set_property', property: 'stage', value: 'placeholder_terminal' }]
    }
  ]
};

export const juoPocNamedStateModel: DefinitionModel = {
  startState: juoStateId('start'),
  states: juoPocNamedStages.map((stage) => ({
    id: juoStateId(stage),
    properties: { machine: 'juo', stage },
    ...(stage === 'terminal'
      ? { terminalCondition: { type: 'property_equals' as const, property: 'stage', value: 'terminal' } }
      : {})
  })),
  transitions: [
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
  ]
};

export type JuoProductionInputStatus = 'required' | 'stub' | 'deferred' | 'excluded';
export type JuoProductionInputValueType = 'fraction' | 'decimal' | 'formula' | 'placeholder';
export type JuoProductionInputRewardValueType = 'literal' | 'formula' | 'placeholder';

export interface JuoProductionInputFieldRequirement {
  readonly field: string;
  readonly status: JuoProductionInputStatus;
  readonly requirement: string;
}

export interface JuoProductionInputStateStub {
  readonly stateId: string;
  readonly displayLabel: string;
  readonly stateKind: 'start' | 'terminal' | 'transient' | 'helper';
  readonly isStart: boolean;
  readonly isTerminal: boolean;
  readonly description: string;
  readonly ambiguityNoteStatus: JuoProductionInputStatus;
  readonly ambiguityNote: string;
}

export interface JuoProductionInputTransitionStub {
  readonly transitionId: string;
  readonly fromStateId: string;
  readonly toStateId: string;
  readonly displayLabel: string;
  readonly probabilityRef: string;
  readonly rewardRef: string;
  readonly generatedToStatus: JuoProductionInputStatus;
  readonly generatedTo: null;
}

export interface JuoProductionInputProbabilityStub {
  readonly probabilityId: string;
  readonly valueType: JuoProductionInputValueType;
  readonly valueStatus: JuoProductionInputStatus;
  readonly sourceNote: string;
  readonly normalizationGroup: string;
}

export interface JuoProductionInputRewardStub {
  readonly rewardId: string;
  readonly rewardUnit: string;
  readonly valueType: JuoProductionInputRewardValueType;
  readonly valueStatus: JuoProductionInputStatus;
  readonly sourceNote: string;
  readonly accountingExclusions: readonly string[];
}

export interface JuoProductionInputFixtureStub {
  readonly machineScope: {
    readonly machineId: string;
    readonly machineDisplayName: string;
    readonly scopeStatement: string;
    readonly includedRoutes: readonly string[];
    readonly excludedRoutes: readonly string[];
    readonly knownStubs: readonly string[];
  };
  readonly fieldRequirements: readonly JuoProductionInputFieldRequirement[];
  readonly states: readonly JuoProductionInputStateStub[];
  readonly transitions: readonly JuoProductionInputTransitionStub[];
  readonly probabilities: readonly JuoProductionInputProbabilityStub[];
  readonly rewards: readonly JuoProductionInputRewardStub[];
  readonly targetSemantics: {
    readonly solverTarget: 'transition.to';
    readonly contributionTarget: 'transition.to';
    readonly generatedToStatus: 'deferred';
    readonly runtimeTargetSubstitutionStatus: 'excluded';
  };
  readonly reportIdentity: {
    readonly kind: 'generated_target_comparison';
    readonly title: 'Generated Target Comparison Report';
    readonly sections: readonly ['summary', 'rows'];
    readonly juoSpecificAdapterStatus: 'deferred';
    readonly juoSpecificRowsStatus: 'deferred';
    readonly formatterBranchStatus: 'deferred';
  };
}

export const juoProductionInputFixtureStub: JuoProductionInputFixtureStub = {
  machineScope: {
    machineId: 'juo',
    machineDisplayName: 'Beast King / Juo',
    scopeStatement: 'Production-input fixture stub only; real machine routes are not modeled yet.',
    includedRoutes: ['placeholder_start_to_terminal_route'],
    excludedRoutes: ['real_bonus_routes', 'real_mode_routes', 'real_payout_routes'],
    knownStubs: ['state_table', 'transition_table', 'probability_table', 'reward_table']
  },
  fieldRequirements: [
    { field: 'machine_id', status: 'required', requirement: 'Stable identifier for Beast King / Juo model scope.' },
    { field: 'machine_display_name', status: 'required', requirement: 'Human-facing machine name.' },
    { field: 'known_stubs', status: 'stub', requirement: 'Routes or states intentionally represented but not yet resolved.' },
    { field: 'generated_to', status: 'deferred', requirement: 'Diagnostic-only metadata until a target-semantics checkpoint approves a change.' },
    { field: 'runtime_target_substitution', status: 'excluded', requirement: 'Not part of the first production-input pass.' }
  ],
  states: [
    {
      stateId: juoStateId('production_stub_start'),
      displayLabel: 'Production stub start',
      stateKind: 'start',
      isStart: true,
      isTerminal: false,
      description: 'Explicit start placeholder for the future production-input graph.',
      ambiguityNoteStatus: 'stub',
      ambiguityNote: 'Real Beast King / Juo start condition is unresolved.'
    },
    {
      stateId: juoStateId('production_stub_terminal'),
      displayLabel: 'Production stub terminal',
      stateKind: 'terminal',
      isStart: false,
      isTerminal: true,
      description: 'Explicit terminal placeholder for the future production-input graph.',
      ambiguityNoteStatus: 'stub',
      ambiguityNote: 'Real Beast King / Juo terminal condition is unresolved.'
    }
  ],
  transitions: [
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
  ],
  probabilities: [
    {
      probabilityId: 'juo_probability_placeholder_unresolved',
      valueType: 'placeholder',
      valueStatus: 'stub',
      sourceNote: 'Unresolved placeholder; no real Beast King / Juo probability value has been inserted.',
      normalizationGroup: 'juo_production_stub_start_outgoing'
    }
  ],
  rewards: [
    {
      rewardId: 'juo_reward_placeholder_unresolved',
      rewardUnit: 'placeholder_reward_unit',
      valueType: 'placeholder',
      valueStatus: 'stub',
      sourceNote: 'Unresolved placeholder; no real Beast King / Juo reward value has been inserted.',
      accountingExclusions: ['time', 'exchange_rate', 'cost']
    }
  ],
  targetSemantics: {
    solverTarget: 'transition.to',
    contributionTarget: 'transition.to',
    generatedToStatus: 'deferred',
    runtimeTargetSubstitutionStatus: 'excluded'
  },
  reportIdentity: {
    kind: 'generated_target_comparison',
    title: 'Generated Target Comparison Report',
    sections: ['summary', 'rows'],
    juoSpecificAdapterStatus: 'deferred',
    juoSpecificRowsStatus: 'deferred',
    formatterBranchStatus: 'deferred'
  }
};
