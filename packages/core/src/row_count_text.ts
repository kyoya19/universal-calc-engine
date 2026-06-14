import { formatNumberPlainText } from './number_text';

export function formatRowCountPlainText(count: number): string {
  return `rows: ${formatNumberPlainText(count)}`;
}
