import { Transforms3d } from "@shopify/react-native-skia";
import { useCallback } from "react";
import { useWindowDimensions } from "react-native";
import {
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withSequence,
  withSpring,
} from "react-native-reanimated";

const ROTATE_SENSITIVITY = 0.016;
const BOUNCE_SCALE = 1.08;

export default function useTransform() {
  const window = useWindowDimensions();
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  const transform = useDerivedValue<Transforms3d>(() => {
    return [
      {
        translate: [window.width / 2, window.height / 2],
      },
      {
        rotate: rotate.get(),
      },
      {
        scale: scale.get(),
      },
    ];
  }, [window]);

  const updateX = useCallback(
    (x: number) => {
      "worklet";

      rotate.set(rotate.get() + x * ROTATE_SENSITIVITY);
    },
    [rotate]
  );

  const stopX = useCallback(() => {
    "worklet";

    cancelAnimation(rotate);
  }, [rotate]);

  const decayX = useCallback(
    (velocityX: number) => {
      "worklet";

      rotate.set(
        withDecay({
          velocity: velocityX * ROTATE_SENSITIVITY,
        })
      );
    },
    [rotate]
  );

  const bounce = useCallback(() => {
    "worklet";

    scale.set(1);
    scale.set(
      withSequence(
        withSpring(BOUNCE_SCALE, {
          damping: 12,
          mass: 0.45,
          stiffness: 240,
        }),
        withSpring(1, {
          damping: 13,
          mass: 0.42,
          stiffness: 260,
        })
      )
    );
  }, [scale]);

  return { transform, updateX, stopX, decayX, bounce };
}
