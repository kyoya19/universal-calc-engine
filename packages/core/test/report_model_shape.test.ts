import { describe, expect, test } from 'vitest';
import type { ReportModel, ReportRowStatus } from '../src';
import { formatReportModelPlainText } from '../src';
import {
  buildAcceptedGeneratedTargetSolverGateSummaryReportModelFixture,
  buildGeneratedTargetComparisonReportModelFixture,
  buildRejectedGeneratedTargetSolverGateSummaryReportModelFixture
} from './fixtures/reporting';

const reportRowStatuses = new Set<ReportRowStatus>(['ok', 'warning', 'rejected', 'info']);

function expectReportModelShape(reportModel: ReportModel): void {
  expect(reportModel.kind).not.toBe('');
  expect(reportModel.title).not.toBe('');
  expect(reportModel.sections.length).toBeGreaterThan(0);

  const sectionIds = reportModel.sections.map((section) => section.id);
  expect(new Set(sectionIds).size).toBe(sectionIds.length);

  for (const section of reportModel.sections) {
    expect(section.id).not.toBe('');
    expect(section.title).not.toBe('');

    const rowIds = section.rows.map((row) => row.id);
    expect(new Set(rowIds).size).toBe(rowIds.length);

    for (const row of section.rows) {
      expect(row.id).not.toBe('');
      expect(row.label).not.toBe('');
      expect(row.plainText).not.toBe('');

      if (row.status !== undefined) {
        expect(reportRowStatuses.has(row.status)).toBe(true);
      }
    }
  }
}

function expectPlainTextFallbackShape(reportModel: ReportModel): void {
  expect(formatReportModelPlainText(reportModel)).toBe(
    [
      reportModel.title,
      ...reportModel.sections.flatMap((section) => [
        '',
        `## ${section.title}`,
        ...section.rows.map((row) => row.plainText)
      ])
    ].join('\n')
  );
}

describe('report model shape invariants', () => {
  test('keeps generated-target comparison report model shape stable', () => {
    const { comparisonReport, reportModel } = buildGeneratedTargetComparisonReportModelFixture();

    expectReportModelShape(reportModel);
    expect(reportModel.sections.map((section) => section.id)).toEqual(['summary', 'rows']);
    expect(reportModel.sections[0]!.rows.map((row) => row.id)).toEqual([
      'edgeCount',
      'matchCount',
      'missingGeneratedTargetCount',
      'explicitGeneratedMismatchCount'
    ]);
    expect(reportModel.sections[1]!.rows.map((row) => row.id)).toEqual(
      comparisonReport.rows.map((_row, index) => `row-${index}`)
    );
    expectPlainTextFallbackShape(reportModel);
  });

  test('keeps accepted solver gate summary report model shape stable', () => {
    const { reportModel } = buildAcceptedGeneratedTargetSolverGateSummaryReportModelFixture();

    expectReportModelShape(reportModel);
    expect(reportModel.sections.map((section) => section.id)).toEqual(['summary']);
    expect(reportModel.sections[0]!.rows.map((row) => row.id)).toEqual([
      'accepted',
      'edgeCount',
      'generatedTargetReadyEdgeCount'
    ]);
    expectPlainTextFallbackShape(reportModel);
  });

  test('keeps rejected solver gate summary report model shape stable', () => {
    const { summary, reportModel } = buildRejectedGeneratedTargetSolverGateSummaryReportModelFixture();

    expect(summary.accepted).toBe(false);
    expectReportModelShape(reportModel);
    expect(reportModel.sections.map((section) => section.id)).toEqual(['summary']);
    expect(reportModel.sections[0]!.rows.map((row) => row.id)).toEqual([
      'accepted',
      'edgeCount',
      'generatedTargetReadyEdgeCount',
      'rejectionCode',
      'rejectionType',
      'rejectionMessage'
    ]);
    expectPlainTextFallbackShape(reportModel);
  });
});
