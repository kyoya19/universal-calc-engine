import { describe, expect, test } from 'vitest';
import {
  buildGeneratedTargetComparisonReport,
  expandGraphFromModel,
  formatReportModelPlainText,
  generatedTargetComparisonReportToReportModel
} from '../src';
import { juoPocNamedStateModel } from './fixtures/juo';

describe('Juo PoC report model non-connection boundary', () => {
  test('keeps Juo placeholder graph routed only through generic generated-target comparison reporting', () => {
    const graph = expandGraphFromModel(juoPocNamedStateModel);
    const comparison = buildGeneratedTargetComparisonReport(graph);
    const report = generatedTargetComparisonReportToReportModel(comparison);
    const plainText = formatReportModelPlainText(report);

    expect(report.kind).toBe('generated_target_comparison');
    expect(report.title).toBe('Generated Target Comparison Report');
    expect(report.sections.map((section) => section.id)).toEqual(['summary', 'rows']);
    expect(report.sections[0]!.rows.map((row) => row.id)).toEqual([
      'edgeCount',
      'matchCount',
      'missingGeneratedTargetCount',
      'explicitGeneratedMismatchCount'
    ]);
    expect(report.sections[1]!.rows).toHaveLength(comparison.rows.length);
    expect(report.sections[1]!.rows.map((row) => Object.keys(row.metadata ?? {}).sort())).toEqual(
      comparison.rows.map(() => ['comparisonStatus', 'explicitTo', 'from', 'generatedTo', 'generatedToMissing'])
    );
    expect(report.sections[1]!.rows.every((row) => row.status === 'ok')).toBe(true);
    expect(plainText).toContain('Generated Target Comparison Report');
    expect(plainText).toContain('## Summary');
    expect(plainText).toContain('## Rows');
    expect(plainText).not.toContain('Juo Report');
    expect(plainText).not.toContain('Beast King');
  });
});
