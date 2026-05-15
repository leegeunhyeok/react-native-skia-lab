export function randomBetween(min: number, max: number) {
  'worklet';

  return min + Math.random() * (max - min);
}

export function randomSign() {
  'worklet';

  return Math.random() > 0.5 ? 1 : -1;
}
