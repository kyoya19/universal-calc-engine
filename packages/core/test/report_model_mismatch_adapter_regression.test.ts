import { describe, expect, test } from 'vitest';
import {
  buildExplicitGeneratedMismatchComparisonReportModelFixture,
  buildExplicitGeneratedMismatchSolverGateSummaryReportModelFixture,
  explicitGeneratedMismatchFixture
} from './fixtures/reporting';
import { compactRows } from './fixtures/report_rows';

describe('report model mismatch adapter regressions', () => {
  test('keeps explicit mismatch comparison report rows stable', () => {
    const { reportModel } = buildExplicitGeneratedMismatchComparisonReportModelFixture();

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
      plainText: `row 0: from: ${explicitGeneratedMismatchFixture.from} explicitTo: ${explicitGeneratedMismatchFixture.explicitTo} generatedTo: ${explicitGeneratedMismatchFixture.generatedTo} status: explicit_generated_mismatch`,
      status: 'rejected',
      metadata: {
        from: explicitGeneratedMismatchFixture.from,
        explicitTo: explicitGeneratedMismatchFixture.explicitTo,
        generatedTo: explicitGeneratedMismatchFixture.generatedTo,
        generatedToMissing: false,
        comparisonStatus: 'explicit_generated_mismatch'
      }
    });
  });

  test('keeps explicit mismatch solver gate summary rows stable', () => {
    const { reportModel } = buildExplicitGeneratedMismatchSolverGateSummaryReportModelFixture();
    const rejectionMessage = `Explicit target ${explicitGeneratedMismatchFixture.explicitTo} differs from generated target ${explicitGeneratedMismatchFixture.generatedTo}`;

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
