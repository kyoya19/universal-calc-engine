import { describe, expect, test } from 'vitest';
import {
  expandGraphFromModel,
  serializeStateGraphSummary,
  stateGraphSummaryToJson,
  summarizeStateGraph
} from '../src';
import { representativeSugorokuModel } from './fixtures/sugoroku';

describe('state graph summary serialization', () => {
  test('serializes representative Sugoroku graph diagnostics without changing summary values', () => {
    const graph = expandGraphFromModel(representativeSugorokuModel);
    const summary = summarizeStateGraph(graph);
    const serialized = serializeStateGraphSummary(summary);
    const json = stateGraphSummaryToJson(summary);

    expect(serialized).toEqual({
      summaryVersion: 1,
      ...summary,
      diagnosticCountsByType: { ...summary.diagnosticCountsByType }
    });
    expect(serialized.edgeCount).toBe(6);
    expect(serialized.explicitGeneratedMatchCount).toBe(6);
    expect(serialized.explicitGeneratedMismatchCount).toBe(0);
    expect(json).toContain('"summaryVersion": 1');
    expect(json).toContain('"explicitGeneratedMismatchCount": 0');
  });

  test('returns parseable JSON text from the state graph summary JSON helper', () => {
    const graph = expandGraphFromModel(representativeSugorokuModel);
    const summary = summarizeStateGraph(graph);
    const jsonText = stateGraphSummaryToJson(summary);
    const parsed = JSON.parse(jsonText);

    expect(jsonText.trim().startsWith('{')).toBe(true);
    expect(parsed.summaryVersion).toBe(1);
    expect(parsed.edgeCount).toBe(summary.edgeCount);
    expect(parsed.diagnosticCountsByType).toEqual(summary.diagnosticCountsByType);
  });
});