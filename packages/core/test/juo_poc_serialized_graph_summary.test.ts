import { describe, expect, test } from 'vitest';
import { expandGraphFromModel, serializeStateGraphSummary, stateGraphSummaryToJson, summarizeStateGraph } from '../src';
import { juoPocNamedStages, juoPocNamedStateModel } from './fixtures/juo';

describe('Juo PoC serialized graph summary compatibility', () => {
  test('serializes the named-state placeholder graph summary without production value wiring', () => {
    const graph = expandGraphFromModel(juoPocNamedStateModel);
    const summary = summarizeStateGraph(graph);
    const serialized = serializeStateGraphSummary(summary);
    const json = stateGraphSummaryToJson(summary);
    const parsed = JSON.parse(json);

    expect(serialized).toEqual({
      summaryVersion: 1,
      stateCount: juoPocNamedStages.length,
      generatedStateCount: juoPocNamedStages.length - 1,
      edgeCount: juoPocNamedStages.length - 1,
      edgeWithGeneratedTargetCount: juoPocNamedStages.length - 1,
      explicitGeneratedMatchCount: juoPocNamedStages.length - 1,
      explicitGeneratedMismatchCount: 0,
      explicitGeneratedMatchRate: 1,
      explicitGeneratedMismatchRate: 0,
      edgeWithoutGeneratedTargetCount: 0,
      diagnosticCount: 0,
      diagnosticCountsByType: {
        missing_generated_candidate: 0,
        explicit_generated_mismatch: 0,
        duplicate_state_ignored: 0,
        depth_limit_reached: 0,
        max_states_reached: 0
      }
    });
    expect(parsed).toEqual(serialized);
    expect(Object.keys(parsed).sort()).toEqual(Object.keys(serialized).sort());
  });
});
