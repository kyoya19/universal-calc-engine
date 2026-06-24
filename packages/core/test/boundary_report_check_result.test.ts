import { describe, expect, it } from 'vitest';
import {
  boundaryReportCheckResultToJson,
  boundaryReportDigestToCheckResult,
  definitionModelToBoundaryReportCheckResult,
  definitionModelToBoundaryReportCheckResultPlainText,
  formatBoundaryReportCheckResultPlainText,
  serializeBoundaryReportCheckResult
} from '../src/boundary_report_check_result';
import { definitionModelToBoundaryReportDigest } from '../src/boundary_report_digest';
import { boundaryReportDefinitionModel } from './boundary_report_fixture';

const model = boundaryReportDefinitionModel;

describe('boundary report check result helpers', () => {
  it('builds a check result from a digest', () => {
    const result = boundaryReportDigestToCheckResult(definitionModelToBoundaryReportDigest(model));

    expect(result.ok).toBe(true);
    expect(result.digest.statusOverview.level).toBe('ok');
  });

  it('serializes a check result', () => {
    const result = definitionModelToBoundaryReportCheckResult(model);

    expect(serializeBoundaryReportCheckResult(result)).toEqual(result);
    expect(JSON.parse(boundaryReportCheckResultToJson(result))).toEqual(result);
  });

  it('builds a check result from a definition model', () => {
    const result = definitionModelToBoundaryReportCheckResult(model);

    expect(result.ok).toBe(true);
    expect(result.digest.reports).toHaveLength(3);
  });

  it('formats a check result as plain text', () => {
    const text = formatBoundaryReportCheckResultPlainText(
      definitionModelToBoundaryReportCheckResult(model)
    );

    expect(text).toContain('ok: true');
    expect(text).toContain('statusLevel: ok');
  });

  it('builds check result plain text from a definition model', () => {
    const text = definitionModelToBoundaryReportCheckResultPlainText(model);

    expect(text).toContain('ok: true');
    expect(text).toContain('State Graph Summary');
  });
});
