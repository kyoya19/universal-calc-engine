import { describe, expect, it } from 'vitest';
import * as core from '../src';
import {
  boundaryReportDigestToJson,
  definitionModelToBoundaryReportDigest,
  definitionModelToBoundaryReportDigestPlainText,
  formatBoundaryReportDigestPlainText,
  serializeBoundaryReportDigest
} from '../src/boundary_report_digest';

const model = {
  startState: 'start',
  states: [
    { id: 'start', properties: { step: 0 } },
    { id: 'state:{step=1}', terminal: true, properties: { step: 1 } }
  ],
  transitions: [
    {
      from: 'start',
      to: 'state:{step=1}',
      probability: 1,
      effects: [{ type: 'set_property' as const, property: 'step', value: 1 }]
    }
  ]
};

describe('definitionModelToBoundaryReportDigest', () => {
  it('builds boundary reports, report text, and status overview together', () => {
    const digest = definitionModelToBoundaryReportDigest(model);

    expect(digest.reports).toHaveLength(3);
    expect(digest.reports.map((report) => report.kind)).toEqual([
      'state_graph_summary',
      'transition_probability_audit',
      'generated_target_comparison'
    ]);
    expect(digest.reportText).toContain('State Graph Summary');
    expect(digest.reportText).toContain('Transition Probability Audit');
    expect(digest.reportText).toContain('Generated Target Comparison Report');
    expect(digest.statusOverview.level).toBe('ok');
    expect(digest.statusOverview.plainText).toContain('rejected: 0');
  });

  it('keeps digest reports and status overview stable after JSON serialization', () => {
    const digest = definitionModelToBoundaryReportDigest(model);
    const serializedDigest = JSON.parse(JSON.stringify(digest));

    expect(serializedDigest.reports).toHaveLength(3);
    expect(serializedDigest.reports.map((report: { kind: string }) => report.kind)).toEqual([
      'state_graph_summary',
      'transition_probability_audit',
      'generated_target_comparison'
    ]);
    expect(serializedDigest.statusOverview).toMatchObject({
      level: 'ok',
      summary: {
        rejected: 0,
        warning: 0
      }
    });
    expect(serializedDigest.reportText).toBe(digest.reportText);
  });

  it('serializes boundary report digests through the helper as stable copies', () => {
    const digest = definitionModelToBoundaryReportDigest(model);
    const serializedDigest = serializeBoundaryReportDigest(digest);
    const firstDigestRow = digest.reports[0]!.sections[0]!.rows[0]!;
    const firstSerializedRow = serializedDigest.reports[0]!.sections[0]!.rows[0]!;

    expect(serializedDigest).toEqual(digest);
    expect(serializedDigest).not.toBe(digest);
    expect(serializedDigest.reports).not.toBe(digest.reports);
    expect(serializedDigest.reports[0]).not.toBe(digest.reports[0]);
    expect(serializedDigest.reports[0]!.sections).not.toBe(digest.reports[0]!.sections);
    expect(serializedDigest.reports[0]!.sections[0]!.rows).not.toBe(digest.reports[0]!.sections[0]!.rows);
    expect(firstSerializedRow).not.toBe(firstDigestRow);
    expect(firstSerializedRow.metadata).toEqual(firstDigestRow.metadata);
    expect(firstSerializedRow.metadata).not.toBe(firstDigestRow.metadata);
    expect(serializedDigest.statusOverview).not.toBe(digest.statusOverview);
    expect(serializedDigest.statusOverview.summary).not.toBe(digest.statusOverview.summary);
  });

  it('serializes boundary report digests through the JSON helper', () => {
    const digest = definitionModelToBoundaryReportDigest(model);
    const serializedDigest = JSON.parse(boundaryReportDigestToJson(digest));

    expect(serializedDigest.reports).toHaveLength(3);
    expect(serializedDigest.reports.map((report: { kind: string }) => report.kind)).toEqual([
      'state_graph_summary',
      'transition_probability_audit',
      'generated_target_comparison'
    ]);
    expect(serializedDigest.statusOverview).toMatchObject({
      level: 'ok',
      summary: {
        rejected: 0,
        warning: 0
      }
    });
    expect(serializedDigest.reportText).toBe(digest.reportText);
  });

  it('aligns digest JSON helper output', () => {
    const digest = definitionModelToBoundaryReportDigest(model);

    expect(boundaryReportDigestToJson(digest)).toBe(JSON.stringify(serializeBoundaryReportDigest(digest)));
  });

  it('returns parseable JSON text from the boundary report digest JSON helper', () => {
    const digest = definitionModelToBoundaryReportDigest(model);
    const jsonText = boundaryReportDigestToJson(digest);
    const parsedDigest = JSON.parse(jsonText);

    expect(jsonText.trim().startsWith('{')).toBe(true);
    expect(parsedDigest.statusOverview).toMatchObject({
      level: 'ok',
      summary: {
        rejected: 0,
        warning: 0
      }
    });
  });

  it('formats a digest as plain text', () => {
    const text = formatBoundaryReportDigestPlainText(definitionModelToBoundaryReportDigest(model));

    expect(text).toContain('statusLevel: ok');
    expect(text).toContain('rejected: 0');
    expect(text).toContain('---');
    expect(text).toContain('State Graph Summary');
  });

  it('formats a digest as plain text in boundary order', () => {
    const digest = definitionModelToBoundaryReportDigest(model);

    expect(formatBoundaryReportDigestPlainText(digest)).toBe(
      [
        `statusLevel: ${digest.statusOverview.level}`,
        digest.statusOverview.plainText,
        '',
        '---',
        '',
        digest.reportText
      ].join('\n')
    );
  });

  it('formats copied digest text', () => {
    const digest = definitionModelToBoundaryReportDigest(model);
    const copy = serializeBoundaryReportDigest(digest);

    expect(formatBoundaryReportDigestPlainText(copy)).toBe(formatBoundaryReportDigestPlainText(digest));
  });

  it('keeps digest plain text stable after JSON serialization', () => {
    const text = formatBoundaryReportDigestPlainText(definitionModelToBoundaryReportDigest(model));

    expect(JSON.parse(JSON.stringify(text))).toBe(text);
  });

  it('builds digest plain text directly from a definition model', () => {
    const text = definitionModelToBoundaryReportDigestPlainText(model);

    expect(text).toContain('statusLevel: ok');
    expect(text).toContain('Generated Target Comparison Report');
  });

  it('keeps definition-model digest plain text stable after JSON serialization', () => {
    const text = definitionModelToBoundaryReportDigestPlainText(model);

    expect(JSON.parse(JSON.stringify(text))).toBe(text);
  });

  it('formats model digest text through the formatter', () => {
    const digest = definitionModelToBoundaryReportDigest(model);

    expect(definitionModelToBoundaryReportDigestPlainText(model)).toBe(formatBoundaryReportDigestPlainText(digest));
  });

  it('exposes boundary report digest serialization helpers from the public entrypoint', () => {
    const digest = core.definitionModelToBoundaryReportDigest(model);
    const serializedDigest = core.serializeBoundaryReportDigest(digest);

    expect(serializedDigest).toEqual(digest);
    expect(JSON.parse(core.boundaryReportDigestToJson(digest))).toMatchObject({
      statusOverview: {
        level: 'ok',
        summary: {
          rejected: 0,
          warning: 0
        }
      }
    });
  });

  it('keeps public boundary report digest JSON helper aligned with serialized copies', () => {
    const digest = core.definitionModelToBoundaryReportDigest(model);
    const serializedDigest = core.serializeBoundaryReportDigest(digest);
    const jsonText = core.boundaryReportDigestToJson(digest);
    const parsedDigest = JSON.parse(jsonText);
    const firstDigestRow = digest.reports[0]!.sections[0]!.rows[0]!;
    const firstParsedRow = parsedDigest.reports[0]!.sections[0]!.rows[0]!;

    expect(jsonText).toBe(JSON.stringify(serializedDigest));
    expect(parsedDigest).toEqual(serializedDigest);
    expect(parsedDigest).not.toBe(digest);
    expect(parsedDigest.reports).not.toBe(digest.reports);
    expect(firstParsedRow).not.toBe(firstDigestRow);
    expect(firstParsedRow.metadata).toEqual(firstDigestRow.metadata);
    expect(firstParsedRow.metadata).not.toBe(firstDigestRow.metadata);
    expect(parsedDigest.statusOverview).not.toBe(digest.statusOverview);
    expect(parsedDigest.statusOverview.summary).not.toBe(digest.statusOverview.summary);
  });

  it('exposes boundary report digest plain text helpers from the public entrypoint', () => {
    const digest = core.definitionModelToBoundaryReportDigest(model);

    expect(core.formatBoundaryReportDigestPlainText(digest)).toBe(formatBoundaryReportDigestPlainText(digest));
    expect(core.definitionModelToBoundaryReportDigestPlainText(model)).toBe(definitionModelToBoundaryReportDigestPlainText(model));
  });

  it('keeps public boundary report digest plain text stable after JSON serialization', () => {
    const text = core.definitionModelToBoundaryReportDigestPlainText(model);

    expect(JSON.parse(JSON.stringify(text))).toBe(text);
    expect(text).toBe(definitionModelToBoundaryReportDigestPlainText(model));
  });
});
