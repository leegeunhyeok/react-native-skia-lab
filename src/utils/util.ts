export function between(value: number, lower: number, upper: number) {
  "worklet";

  return value >= lower && value <= upper;
}

export function sample<T>(items: readonly T[]) {
  "worklet";

  return items[Math.floor(Math.random() * items.length)];
}

export function shuffle<T>(items: readonly T[]) {
  "worklet";

  const result = items.slice();

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const item = result[i];
    result[i] = result[j];
    result[j] = item;
  }

  return result;
}
