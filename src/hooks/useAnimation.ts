import { useEffect, useMemo } from "react";
import {
  FrameInfo,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

type Input = {
  worklet: (frameInfo: FrameInfo) => void;
  frameRate?: number;
  autoStart?: boolean;
};

export default function useAnimation({
  worklet,
  frameRate = 60,
  autoStart = true,
}: Input) {
  const fps = 1000 / frameRate;
  const time = useSharedValue<number | null>(null);

  const frame = useFrameCallback((frameInfo) => {
    if (!time.get()) {
      time.set(frameInfo.timestamp);
    }

    const now = frameInfo.timestamp - time.get()!;
    if (now > fps) {
      worklet(frameInfo);
      time.set(frameInfo.timestamp);
    }
  }, false);

  useEffect(() => {
    if (autoStart) {
      frame.setActive(true);
    }
  }, [autoStart]);

  return useMemo(
    () => ({
      start: () => frame.setActive(true),
      stop: () => frame.setActive(false),
    }),
    []
  );
}
