import { expect, test } from 'vitest';
import {
  serializeStateGraphSummary,
  stateGraphSummaryToJson,
  StateGraphSummary
} from '../src/state_generation';

const summary: StateGraphSummary = {
  stateCount: 1,
  generatedStateCount: 0,
  edgeCount: 0,
  edgeWithGeneratedTargetCount: 0,
  explicitGeneratedMatchCount: 0,
  explicitGeneratedMismatchCount: 0,
  explicitGeneratedMatchRate: 0,
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
};

test('serializes a state graph summary with a version', () => {
  expect(serializeStateGraphSummary(summary)).toEqual({
    summaryVersion: 1,
    ...summary
  });
});

test('formats a serialized state graph summary as JSON text', () => {
  expect(JSON.parse(stateGraphSummaryToJson(summary))).toEqual(serializeStateGraphSummary(summary));
});

test('copies serialized diagnostic counts by value', () => {
  expect(serializeStateGraphSummary(summary).diagnosticCountsByType).not.toBe(summary.diagnosticCountsByType);
});

test('parses state graph summary JSON without sharing nested diagnostic counts', () => {
  const parsed = JSON.parse(stateGraphSummaryToJson(summary));
  const serialized = serializeStateGraphSummary(summary);

  expect(parsed).toEqual(serialized);
  expect(parsed.diagnosticCountsByType).not.toBe(serialized.diagnosticCountsByType);
});
