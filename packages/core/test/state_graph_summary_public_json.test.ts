import { expect, test } from 'vitest';
import {
  DefinitionModel,
  expandGraphFromModel,
  serializeStateGraphSummary,
  stateGraphSummaryToJson,
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

const missingCandidateModel: DefinitionModel = {
  startState: 'start',
  states: [{ id: 'start' }, { id: 'end', terminal: true }],
  transitions: [{ from: 'start', to: 'end', probability: 1 }]
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

test('state graph summary JSON copies diagnostic counts by value only', () => {
  const graph = expandGraphFromModel(model);
  const summary = serializeStateGraphSummary(summarizeStateGraph(graph));
  const copied = JSON.parse(JSON.stringify(summary)) as typeof summary;

  expect(copied).toEqual(summary);
  expect(copied).not.toBe(summary);
  expect(copied.diagnosticCountsByType).not.toBe(summary.diagnosticCountsByType);
  expect(copied.diagnosticCountsByType.explicit_generated_mismatch).toBe(1);
});

test('state graph summary JSON does not expose raw graph collections', () => {
  const graph = expandGraphFromModel(model);
  const json = stateGraphSummaryToJson(summarizeStateGraph(graph));
  const parsed = JSON.parse(json);

  expect(parsed.summaryVersion).toBe(1);
  expect(parsed.edgeCount).toBe(1);
  expect(parsed.diagnosticCount).toBe(1);
  expect(parsed).not.toHaveProperty('states');
  expect(parsed).not.toHaveProperty('generatedStates');
  expect(parsed).not.toHaveProperty('edges');
  expect(parsed).not.toHaveProperty('diagnostics');
  expect(json).not.toContain('transition');
  expect(json).not.toContain('explicit_target');
  expect(json).not.toContain('state:{step=1}');
});

test('serializes missing generated candidate diagnostics as summary-only JSON', () => {
  const graph = expandGraphFromModel(missingCandidateModel);
  const json = stateGraphSummaryToJson(summarizeStateGraph(graph));

  expect(JSON.parse(json)).toEqual({
    summaryVersion: 1,
    stateCount: 1,
    generatedStateCount: 0,
    edgeCount: 1,
    edgeWithGeneratedTargetCount: 0,
    explicitGeneratedMatchCount: 0,
    explicitGeneratedMismatchCount: 0,
    explicitGeneratedMatchRate: 0,
    explicitGeneratedMismatchRate: 0,
    edgeWithoutGeneratedTargetCount: 1,
    diagnosticCount: 1,
    diagnosticCountsByType: {
      missing_generated_candidate: 1,
      explicit_generated_mismatch: 0,
      duplicate_state_ignored: 0,
      depth_limit_reached: 0,
      max_states_reached: 0
    }
  });
  expect(json).not.toContain('from');
  expect(json).not.toContain('to');
  expect(json).not.toContain('end');
});
