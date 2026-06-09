import { describe, expect, test } from 'vitest';
import type { ReportRow } from '../src';
import {
  buildAcceptedGeneratedTargetSolverGateSummaryReportModelFixture,
  buildGeneratedTargetComparisonReportModelFixture,
  buildRejectedGeneratedTargetSolverGateSummaryReportModelFixture
} from './fixtures/reporting';
import { positionStateId } from './fixtures/sugoroku';

function compactRows(rows: ReportRow[]) {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    plainText: row.plainText,
    status: row.status,
    metadata: row.metadata
  }));
}

describe('report model adapter regressions', () => {
  test('keeps generated-target comparison summary rows stable', () => {
    const { reportModel } = buildGeneratedTargetComparisonReportModelFixture();

    expect(compactRows(reportModel.sections[0]!.rows)).toEqual([
      {
        id: 'edgeCount',
        label: 'edgeCount',
        plainText: 'edgeCount: 6',
        status: 'info',
        metadata: { value: 6 }
      },
      {
        id: 'matchCount',
        label: 'matchCount',
        plainText: 'matchCount: 6',
        status: 'ok',
        metadata: { value: 6 }
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
        plainText: 'explicitGeneratedMismatchCount: 0',
        status: 'ok',
        metadata: { value: 0 }
      }
    ]);
  });

  test('keeps generated-target comparison detail rows stable', () => {
    const { reportModel } = buildGeneratedTargetComparisonReportModelFixture();

    expect(compactRows(reportModel.sections[1]!.rows)).toEqual([
      {
        id: 'row-0',
        label: 'row 0',
        plainText: `row 0: from: ${positionStateId(0)} explicitTo: ${positionStateId(1)} generatedTo: ${positionStateId(1)} status: match`,
        status: 'ok',
        metadata: {
          from: positionStateId(0),
          explicitTo: positionStateId(1),
          generatedTo: positionStateId(1),
          generatedToMissing: false,
          comparisonStatus: 'match'
        }
      },
      {
        id: 'row-1',
        label: 'row 1',
        plainText: `row 1: from: ${positionStateId(0)} explicitTo: ${positionStateId(2)} generatedTo: ${positionStateId(2)} status: match`,
        status: 'ok',
        metadata: {
          from: positionStateId(0),
          explicitTo: positionStateId(2),
          generatedTo: positionStateId(2),
          generatedToMissing: false,
          comparisonStatus: 'match'
        }
      },
      {
        id: 'row-2',
        label: 'row 2',
        plainText: `row 2: from: ${positionStateId(1)} explicitTo: ${positionStateId(2)} generatedTo: ${positionStateId(2)} status: match`,
        status: 'ok',
        metadata: {
          from: positionStateId(1),
          explicitTo: positionStateId(2),
          generatedTo: positionStateId(2),
          generatedToMissing: false,
          comparisonStatus: 'match'
        }
      },
      {
        id: 'row-3',
        label: 'row 3',
        plainText: `row 3: from: ${positionStateId(1)} explicitTo: ${positionStateId(3)} generatedTo: ${positionStateId(3)} status: match`,
        status: 'ok',
        metadata: {
          from: positionStateId(1),
          explicitTo: positionStateId(3),
          generatedTo: positionStateId(3),
          generatedToMissing: false,
          comparisonStatus: 'match'
        }
      },
      {
        id: 'row-4',
        label: 'row 4',
        plainText: `row 4: from: ${positionStateId(2)} explicitTo: ${positionStateId(3)} generatedTo: ${positionStateId(3)} status: match`,
        status: 'ok',
        metadata: {
          from: positionStateId(2),
          explicitTo: positionStateId(3),
          generatedTo: positionStateId(3),
          generatedToMissing: false,
          comparisonStatus: 'match'
        }
      },
      {
        id: 'row-5',
        label: 'row 5',
        plainText: `row 5: from: ${positionStateId(2)} explicitTo: ${positionStateId(3)} generatedTo: ${positionStateId(3)} status: match`,
        status: 'ok',
        metadata: {
          from: positionStateId(2),
          explicitTo: positionStateId(3),
          generatedTo: positionStateId(3),
          generatedToMissing: false,
          comparisonStatus: 'match'
        }
      }
    ]);
  });

  test('keeps accepted solver gate summary rows stable', () => {
    const { reportModel } = buildAcceptedGeneratedTargetSolverGateSummaryReportModelFixture();

    expect(compactRows(reportModel.sections[0]!.rows)).toEqual([
      {
        id: 'accepted',
        label: 'accepted',
        plainText: 'accepted: true',
        status: 'ok',
        metadata: { value: true }
      },
      {
        id: 'edgeCount',
        label: 'edgeCount',
        plainText: 'edgeCount: 6',
        status: 'info',
        metadata: { value: 6 }
      },
      {
        id: 'generatedTargetReadyEdgeCount',
        label: 'generatedTargetReadyEdgeCount',
        plainText: 'generatedTargetReadyEdgeCount: 6',
        status: 'info',
        metadata: { value: 6 }
      }
    ]);
  });

  test('keeps rejected solver gate summary rows stable', () => {
    const { reportModel } = buildRejectedGeneratedTargetSolverGateSummaryReportModelFixture();
    const rejectionMessage = `Generated target is missing for edge from ${positionStateId(0)} to ${positionStateId(1)}`;

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
        plainText: 'edgeCount: 3',
        status: 'info',
        metadata: { value: 3 }
      },
      {
        id: 'generatedTargetReadyEdgeCount',
        label: 'generatedTargetReadyEdgeCount',
        plainText: 'generatedTargetReadyEdgeCount: 2',
        status: 'info',
        metadata: { value: 2 }
      },
      {
        id: 'rejectionCode',
        label: 'rejectionCode',
        plainText: 'rejectionCode: missing_generated_target',
        status: 'rejected',
        metadata: { value: 'missing_generated_target' }
      },
      {
        id: 'rejectionType',
        label: 'rejectionType',
        plainText: 'rejectionType: missing_generated_target',
        status: 'rejected',
        metadata: { value: 'missing_generated_target' }
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
