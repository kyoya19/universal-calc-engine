import {
  estimateExternalReverseJson,
  evaluateExternalModelJson,
  toForwardResultHandoff,
  toReverseResultHandoff
} from 'universal-calc-engine';

export const QUALIFIED_PACKAGE = Object.freeze({
  name: 'universal-calc-engine',
  version: '1.1.0',
  importBoundary: 'package-name ESM root'
});

const OPERATIONS = new Set(['forward', 'reverse']);

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function consumerIssue(code, path, message) {
  return { code, path, message };
}

function copyList(value) {
  return Array.isArray(value) ? value.map((item) => ({ ...item })) : [];
}

function validateConsumerRequest(input) {
  const issues = [];

  if (!isRecord(input)) {
    return [consumerIssue('expected_request_object', '$', 'Request must be an object.')];
  }

  if (input.schemaVersion !== 1) {
    issues.push(
      consumerIssue(
        'unsupported_consumer_schema_version',
        '$.schemaVersion',
        'schemaVersion must be 1.'
      )
    );
  }

  if (!OPERATIONS.has(input.operation)) {
    issues.push(
      consumerIssue(
        'unsupported_operation',
        '$.operation',
        'operation must be forward or reverse.'
      )
    );
  }

  if (typeof input.documentText !== 'string') {
    issues.push(
      consumerIssue(
        'expected_document_text',
        '$.documentText',
        'documentText must be a JSON text string.'
      )
    );
  }

  if (input.operation === 'forward') {
    if (input.options !== undefined && !isRecord(input.options)) {
      issues.push(
        consumerIssue(
          'expected_options_object',
          '$.options',
          'Forward options must be an object when supplied.'
        )
      );
    }
  } else if (input.operation === 'reverse' && input.options !== undefined) {
    if (!isRecord(input.options)) {
      issues.push(
        consumerIssue(
          'expected_options_object',
          '$.options',
          'Reverse options must be an object when supplied.'
        )
      );
    } else if (Object.keys(input.options).length > 0) {
      issues.push(
        consumerIssue(
          'reverse_options_not_supported',
          '$.options',
          'The selected checked reverse facade does not accept consumer options.'
        )
      );
    }
  }

  return issues;
}

function forwardFacets(handoff) {
  if (handoff.status === 'failure') {
    return {
      failureStage: handoff.stage,
      convergence: null,
      ambiguity: null,
      warnings: [],
      limitations: []
    };
  }

  return {
    failureStage: null,
    convergence: {
      state: handoff.converged ? 'converged' : 'non_converged',
      converged: handoff.converged
    },
    ambiguity: null,
    warnings: copyList(handoff.warnings),
    limitations: copyList(handoff.limitations)
  };
}

function reverseAmbiguity(selection) {
  if ('parameterId' in selection) {
    return {
      state: selection.status,
      parameterId: selection.parameterId,
      estimatedValue: selection.estimatedValue,
      bestCandidateValues: [...selection.bestCandidateValues]
    };
  }

  return {
    state: selection.identifiability,
    parameterIds: [...selection.parameterIds],
    estimatedAssignment:
      selection.estimatedAssignment === null ? null : { ...selection.estimatedAssignment },
    bestAssignments: selection.bestAssignments.map((assignment) => ({ ...assignment }))
  };
}

function reverseFacets(handoff) {
  if (handoff.status === 'failure') {
    return {
      failureStage: handoff.stage,
      convergence: null,
      ambiguity: null,
      warnings: [],
      limitations: []
    };
  }

  return {
    failureStage: null,
    convergence: null,
    ambiguity: reverseAmbiguity(handoff.selection),
    warnings: copyList(handoff.warnings),
    limitations: copyList(handoff.limitations)
  };
}

function baseEnvelope(operation, outcome) {
  return {
    schemaVersion: 1,
    kind: 'qualified_api_consumer_workbench_response',
    operation,
    executionBoundary: 'local_node_exact_npm_consumer',
    package: { ...QUALIFIED_PACKAGE },
    outcome
  };
}

export function consumerRejectedResponse(operation, issues) {
  return {
    ...baseEnvelope(operation ?? null, 'consumer_input_rejected'),
    consumerIssues: issues.map((issue) => ({ ...issue })),
    analyticalResult: null,
    facets: {
      failureStage: null,
      convergence: null,
      ambiguity: null,
      warnings: [],
      limitations: []
    }
  };
}

function analyticalResponse(operation, handoff, facets) {
  return {
    ...baseEnvelope(
      operation,
      handoff.status === 'success' ? 'qualified_api_success' : 'qualified_api_failure'
    ),
    consumerIssues: [],
    analyticalResult: handoff,
    facets
  };
}

function adapterFailureResponse(operation, error) {
  return {
    ...baseEnvelope(operation ?? null, 'adapter_failure'),
    consumerIssues: [
      consumerIssue(
        'unexpected_adapter_failure',
        '$',
        error instanceof Error ? error.message : 'Unexpected adapter failure.'
      )
    ],
    analyticalResult: null,
    facets: {
      failureStage: null,
      convergence: null,
      ambiguity: null,
      warnings: [],
      limitations: []
    }
  };
}

export function executeConsumerRequest(input) {
  const issues = validateConsumerRequest(input);
  const operation = isRecord(input) && typeof input.operation === 'string' ? input.operation : null;

  if (issues.length > 0) {
    return consumerRejectedResponse(operation, issues);
  }

  try {
    if (input.operation === 'forward') {
      const evaluation = evaluateExternalModelJson(input.documentText, input.options ?? {});
      const handoff = toForwardResultHandoff(evaluation);
      return analyticalResponse('forward', handoff, forwardFacets(handoff));
    }

    const estimation = estimateExternalReverseJson(input.documentText);
    const handoff = toReverseResultHandoff(estimation);
    return analyticalResponse('reverse', handoff, reverseFacets(handoff));
  } catch (error) {
    return adapterFailureResponse(operation, error);
  }
}
