import { expect, test } from 'vitest';
import {
  DefinitionModel,
  expandGraphFromModel,
  serializeStateGraphSummary,
  summarizeStateGraph
} from '../src';

const model: DefinitionModel = {
  startState: 'start',
  states: [{ id: 'start', properties: { step: 0 } }],
  transitions: [
    {
      from: 'start',
      to: 'explicit_target',
      probability: 1,
      effects: [{ type: 'set_property', property: 'step', value: 1 }]
    }
  ]
};

test('serializes state graph diagnostics as a public summary object', () => {
  const graph = expandGraphFromModel(model);
  const summary = serializeStateGraphSummary(summarizeStateGraph(graph));

  expect(JSON.parse(JSON.stringify(summary))).toEqual({
    summaryVersion: 1,
    stateCount: 2,
    generatedStateCount: 1,
    edgeCount: 1,
    edgeWithGeneratedTargetCount: 1,
    explicitGeneratedMatchCount: 0,
    explicitGeneratedMismatchCount: 1,
    explicitGeneratedMatchRate: 0,
    explicitGeneratedMismatchRate: 1,
    edgeWithoutGeneratedTargetCount: 0,
    diagnosticCount: 1,
    diagnosticCountsByType: {
      missing_generated_candidate: 0,
      explicit_generated_mismatch: 1,
      duplicate_state_ignored: 0,
      depth_limit_reached: 0,
      max_states_reached: 0
    }
  });
});
