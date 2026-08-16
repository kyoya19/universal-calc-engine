function list(value) {
  return Array.isArray(value) ? value : [];
}

export function toPresentationModel(response) {
  const consumerIssues = list(response?.consumerIssues);
  const analyticalResult = response?.analyticalResult ?? null;
  const facets = response?.facets ?? {};

  const analyticalIssues =
    analyticalResult?.status === 'failure' ? list(analyticalResult.issues) : [];

  return {
    outcome: response?.outcome ?? 'unknown',
    operation: response?.operation ?? null,
    packageLabel:
      response?.package?.name && response?.package?.version
        ? `${response.package.name}@${response.package.version}`
        : 'unknown package',
    apiStatus: analyticalResult?.status ?? null,
    failureStage:
      facets.failureStage ??
      (analyticalResult?.status === 'failure' ? analyticalResult.stage ?? null : null),
    convergence: facets.convergence ?? null,
    ambiguity: facets.ambiguity ?? null,
    issues: consumerIssues.length > 0 ? consumerIssues : analyticalIssues,
    warnings: list(facets.warnings),
    limitations: list(facets.limitations)
  };
}
