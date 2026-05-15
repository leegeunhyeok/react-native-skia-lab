import { useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";

type Params = {
  readonly disabled: SharedValue<boolean>;
  readonly onCancel: () => void;
  readonly onEnd: (velocity: number) => void;
  readonly onStart: () => void;
  readonly onUpdate: (translation: number) => void;
};

export default function usePan({
  disabled,
  onCancel,
  onEnd,
  onStart,
  onUpdate,
}: Params) {
  return useMemo(
    () =>
      Gesture.Pan()
        .minDistance(2)
        .onBegin(() => {
          if (disabled.value) {
            return;
          }

          onStart();
        })
        .onUpdate(({ translationY }) => {
          if (disabled.value) {
            return;
          }

          onUpdate(translationY);
        })
        .onEnd(({ velocityY }) => {
          if (disabled.value) {
            return;
          }

          onEnd(velocityY);
        })
        .onFinalize(() => {
          onCancel();
        }),
    [disabled, onCancel, onEnd, onStart, onUpdate]
  );
}
