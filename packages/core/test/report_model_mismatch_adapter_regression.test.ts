import { describe, expect, test } from 'vitest';
import type { ReportRow } from '../src';
import {
  buildMismatchedGeneratedTargetComparisonReportModelFixture,
  buildMismatchedGeneratedTargetSolverGateSummaryReportModelFixture,
  generatedTargetMismatchFixture
} from './fixtures/reporting';

function compactRows(rows: ReportRow[]) {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    plainText: row.plainText,
    status: row.status,
    metadata: row.metadata
  }));
}

describe('report model mismatch adapter regressions', () => {
  test('keeps explicit mismatch comparison report rows stable', () => {
    const { reportModel } = buildMismatchedGeneratedTargetComparisonReportModelFixture();

    expect(compactRows(reportModel.sections[0]!.rows)).toEqual([
      {
        id: 'edgeCount',
        label: 'edgeCount',
        plainText: 'edgeCount: 4',
        status: 'info',
        metadata: { value: 4 }
      },
      {
        id: 'matchCount',
        label: 'matchCount',
        plainText: 'matchCount: 3',
        status: 'ok',
        metadata: { value: 3 }
      },
      {
        id: 'missingGeneratedTargetCount',
        label: 'missingGeneratedTargetCount',
        plainText: 'missingGeneratedTargetCount: 0',
        status: 'ok',
        metadata: { value: 0 }
      },
      {
        id: 'explicitGeneratedMismatchCount',
        label: 'explicitGeneratedMismatchCount',
        plainText: 'explicitGeneratedMismatchCount: 1',
        status: 'rejected',
        metadata: { value: 1 }
      }
    ]);

    expect(compactRows(reportModel.sections[1]!.rows)[0]).toEqual({
      id: 'row-0',
      label: 'row 0',
      plainText: `row 0: from: ${generatedTargetMismatchFixture.from} explicitTo: ${generatedTargetMismatchFixture.explicitTo} generatedTo: ${generatedTargetMismatchFixture.generatedTo} status: explicit_generated_mismatch`,
      status: 'rejected',
      metadata: {
        from: generatedTargetMismatchFixture.from,
        explicitTo: generatedTargetMismatchFixture.explicitTo,
        generatedTo: generatedTargetMismatchFixture.generatedTo,
        generatedToMissing: false,
        comparisonStatus: 'explicit_generated_mismatch'
      }
    });
  });

  test('keeps explicit mismatch solver gate summary rows stable', () => {
    const { reportModel } = buildMismatchedGeneratedTargetSolverGateSummaryReportModelFixture();
    const rejectionMessage = `Explicit target ${generatedTargetMismatchFixture.explicitTo} differs from generated target ${generatedTargetMismatchFixture.generatedTo}`;

    expect(compactRows(reportModel.sections[0]!.rows)).toEqual([
      {
        id: 'accepted',
        label: 'accepted',
        plainText: 'accepted: false',
        status: 'rejected',
        metadata: { value: false }
      },
      {
        id: 'edgeCount',
        label: 'edgeCount',
        plainText: 'edgeCount: 4',
        status: 'info',
        metadata: { value: 4 }
      },
      {
        id: 'generatedTargetReadyEdgeCount',
        label: 'generatedTargetReadyEdgeCount',
        plainText: 'generatedTargetReadyEdgeCount: 4',
        status: 'info',
        metadata: { value: 4 }
      },
      {
        id: 'rejectionCode',
        label: 'rejectionCode',
        plainText: 'rejectionCode: explicit_generated_mismatch',
        status: 'rejected',
        metadata: { value: 'explicit_generated_mismatch' }
      },
      {
        id: 'rejectionType',
        label: 'rejectionType',
        plainText: 'rejectionType: explicit_generated_mismatch',
        status: 'rejected',
        metadata: { value: 'explicit_generated_mismatch' }
      },
      {
        id: 'rejectionMessage',
        label: 'rejectionMessage',
        plainText: `rejectionMessage: ${rejectionMessage}`,
        status: 'rejected',
        metadata: { value: rejectionMessage }
      }
    ]);
  });
});
