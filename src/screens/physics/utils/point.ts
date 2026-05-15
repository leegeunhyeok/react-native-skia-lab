import { clamp } from 'react-native-reanimated';

export type Point = {
  x: number;
  y: number;
};

export function distanceBetweenPoints(from: Point, to: Point) {
  'worklet';

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function mixPoints(from: Point, to: Point, t: number): Point {
  'worklet';

  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

export function projectPointToSegment(point: Point, from: Point, to: Point) {
  'worklet';

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq <= 0.001
      ? 0
      : clamp(
          ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSq,
          0,
          1,
        );
  const projected = {
    x: from.x + dx * t,
    y: from.y + dy * t,
  };

  return {
    point: projected,
    t,
    dx,
    dy,
    lengthSq,
    length: Math.sqrt(lengthSq),
  };
}
