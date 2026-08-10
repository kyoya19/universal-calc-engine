export function stableSum(values: Iterable<number>): number {
  let sum = 0;
  let compensation = 0;

  for (const value of values) {
    if (!Number.isFinite(sum) || !Number.isFinite(value)) {
      sum += value;
      compensation = 0;
      continue;
    }

    const next = sum + value;
    if (!Number.isFinite(next)) {
      sum = next;
      compensation = 0;
      continue;
    }

    if (Math.abs(sum) >= Math.abs(value)) {
      compensation += (sum - next) + value;
    } else {
      compensation += (value - next) + sum;
    }
    sum = next;
  }

  return sum + compensation;
}
