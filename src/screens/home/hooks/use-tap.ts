import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";

type Params = {
  readonly disabled: SharedValue<boolean>;
  readonly onPress: (x: number, y: number) => void;
};

export default function useTap({ disabled, onPress }: Params) {
  return useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(8)
        .onEnd(({ x, y }) => {
          if (disabled.value) {
            return;
          }

          onPress(x, y);
        }),
    [disabled, onPress]
  );
}
