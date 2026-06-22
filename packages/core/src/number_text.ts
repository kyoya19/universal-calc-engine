export function formatNumberPlainText(value: number): string {
  return String(value);
}

export function formatNumberDiagnosticText(value: number): string {
  if (Number.isNaN(value)) {
    return 'NaN';
  }

  if (value === Infinity) {
    return 'Infinity';
  }

  if (value === -Infinity) {
    return '-Infinity';
  }

  return formatNumberPlainText(value);
}
