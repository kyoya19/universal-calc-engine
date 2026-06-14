import { describe, expect, it } from 'vitest';
import type { StateGraphSummary } from '../src/state_generation';
import {
  formatReportModelPlainText,
  stateGraphSummaryToReportModel
} from '../src/report_model';

function buildSummary(): StateGraphSummary {
  return {
    stateCount: 3,
    generatedStateCount: 1,
    edgeCount: 2,
    edgeWithGeneratedTargetCount: 1,
    explicitGeneratedMatchCount: 0,
    explicitGeneratedMismatchCount: 1,
    explicitGeneratedMatchRate: 0,
    explicitGeneratedMismatchRate: 1,
    edgeWithoutGeneratedTargetCount: 1,
    diagnosticCount: 2,
    diagnosticCountsByType: {
      missing_generated_candidate: 1,
      explicit_generated_mismatch: 1,
      duplicate_state_ignored: 0,
      depth_limit_reached: 0,
      max_states_reached: 0
    }
  };
}

describe('stateGraphSummaryToReportModel', () => {
  it('converts state graph summary counters into report rows', () => {
    const report = stateGraphSummaryToReportModel(buildSummary());

    expect(report.kind).toBe('state_graph_summary');
    expect(report.title).toBe('State Graph Summary');
    expect(report.sections.map((section) => section.id)).toEqual(['summary', 'diagnostics']);

    const rows = report.sections.flatMap((section) => section.rows);
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'stateCount',
        plainText: 'stateCount: 3',
        status: 'info'
      })
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'edgeWithoutGeneratedTargetCount',
        plainText: 'edgeWithoutGeneratedTargetCount: 1',
        status: 'warning'
      })
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'explicitGeneratedMismatchCount',
        plainText: 'explicitGeneratedMismatchCount: 1',
        status: 'rejected'
      })
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'diagnostic-explicit_generated_mismatch',
        plainText: 'explicit_generated_mismatch: 1',
        status: 'warning'
      })
    );
  });

  it('formats state graph summary reports as plain text', () => {
    const text = formatReportModelPlainText(
      stateGraphSummaryToReportModel(buildSummary())
    );

    expect(text).toContain('State Graph Summary');
    expect(text).toContain('edgeCount: 2');
    expect(text).toContain('explicit_generated_mismatch: 1');
  });
});
