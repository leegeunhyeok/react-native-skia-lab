import { clamp, type SharedValue } from "react-native-reanimated";
import {
  FRAME_DELTA_DEFAULT_SECONDS,
  FRAME_DELTA_MAX_SECONDS,
  FRAME_DELTA_MIN_SECONDS,
} from "../constants/animation";

type ItemIndexedFrame = {
  itemIndex: number;
};

export function getFrameDeltaSeconds(
  timestamp: number,
  lastTimestamp: SharedValue<number>
) {
  "worklet";

  if (!lastTimestamp.value) {
    lastTimestamp.value = timestamp;
    return FRAME_DELTA_DEFAULT_SECONDS;
  }

  const dt = clamp(
    (timestamp - lastTimestamp.value) / 1000,
    FRAME_DELTA_MIN_SECONDS,
    FRAME_DELTA_MAX_SECONDS
  );
  lastTimestamp.value = timestamp;
  return dt;
}

export function positiveModulo(value: number, divisor: number) {
  "worklet";

  if (divisor <= 0) {
    return 0;
  }

  return ((value % divisor) + divisor) % divisor;
}

export function findFrameByItemIndex<TFrame extends ItemIndexedFrame>(
  frames: readonly TFrame[],
  itemIndex: number
): TFrame | null {
  "worklet";

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    if (frame.itemIndex === itemIndex) {
      return frame;
    }
  }

  return null;
}

export function scaleLength(value: number, scale: number) {
  return Math.round(value * scale * 100) / 100;
}
