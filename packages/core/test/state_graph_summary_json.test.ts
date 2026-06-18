import { describe, expect, test } from 'vitest';
import { expandGraphFromModel, stateGraphSummaryToJson, summarizeStateGraph } from '../src';
import { representativeSugorokuModel } from './fixtures/sugoroku';

describe('state graph summary JSON boundary', () => {
  test('keeps graph summary counts stable after JSON serialization', () => {
    const graph = expandGraphFromModel(representativeSugorokuModel);
    const summary = summarizeStateGraph(graph);
    const serialized = JSON.parse(stateGraphSummaryToJson(summary));

    expect(serialized).toEqual({
      summaryVersion: 1,
      stateCount: 4,
      generatedStateCount: 3,
      edgeCount: 6,
      edgeWithGeneratedTargetCount: 6,
      explicitGeneratedMatchCount: 6,
      explicitGeneratedMismatchCount: 0,
      explicitGeneratedMatchRate: 1,
      explicitGeneratedMismatchRate: 0,
      edgeWithoutGeneratedTargetCount: 0,
      diagnosticCount: 3,
      diagnosticCountsByType: {
        missing_generated_candidate: 0,
        explicit_generated_mismatch: 0,
        duplicate_state_ignored: 3,
        depth_limit_reached: 0,
        max_states_reached: 0
      }
    });
  });
});
