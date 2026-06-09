import { describe, expect, test } from 'vitest';
import type { ReportModel, ReportRow, ReportRowStatus, ReportSection } from '../src';
import {
  formatReportModelPlainText,
  generatedTargetComparisonReportToReportModel,
  generatedTargetSolverGateResultSummaryToReportModel
} from '../src';

describe('reporting exports', () => {
  test('formats a report model imported from the public entrypoint', () => {
    const status: ReportRowStatus = 'info';
    const row: ReportRow = {
      id: 'surface',
      label: 'surface',
      plainText: 'surface: exported',
      status,
      metadata: { exported: true }
    };
    const section: ReportSection = {
      id: 'summary',
      title: 'Summary',
      rows: [row]
    };
    const report: ReportModel = {
      kind: 'reporting_surface_export_check',
      title: 'Reporting Surface Export Check',
      sections: [section]
    };

    expect(formatReportModelPlainText(report)).toBe(
      ['Reporting Surface Export Check', '', '## Summary', 'surface: exported'].join('\n')
    );
  });

  test('exports current report model adapter functions', () => {
    expect(typeof generatedTargetComparisonReportToReportModel).toBe('function');
    expect(typeof generatedTargetSolverGateResultSummaryToReportModel).toBe('function');
  });
});
