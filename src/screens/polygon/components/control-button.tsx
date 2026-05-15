import { Minus, Plus } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const CONTROL_BUTTON_SIZE = 44;
export const CONTROL_BUTTON_GAP = 10;

const BUTTON_COLOR = "#010101";
const ICON_COLOR = "#FFFFFF";
const PRESSED_SCALE = 0.94;

type Props = {
  icon: "plus" | "minus";
  limit: number;
  sides: SharedValue<number>;
  onEnd: () => void;
};

export default function ControlButton({ icon, limit, sides, onEnd }: Props) {
  const Icon = icon === "plus" ? Plus : Minus;
  const pressScale = useSharedValue(1);

  const disabled = useCallback(() => {
    "worklet";

    return icon === "plus" ? sides.get() >= limit : sides.get() <= limit;
  }, [icon, limit, sides]);

  const tap = useMemo(() => {
    return Gesture.Tap()
      .hitSlop(8)
      .onBegin(() => {
        if (disabled()) {
          return;
        }

        pressScale.set(
          withSpring(PRESSED_SCALE, {
            damping: 14,
            mass: 0.42,
            stiffness: 360,
          })
        );
      })
      .onFinalize(() => {
        pressScale.set(
          withSpring(1, {
            damping: 10,
            mass: 0.36,
            stiffness: 310,
          })
        );
      })
      .onEnd(() => {
        if (disabled()) {
          return;
        }

        onEnd();
      });
  }, [disabled, onEnd, pressScale]);

  const buttonStyle = useAnimatedStyle(() => {
    return {
      opacity: disabled() ? 0.72 : 1,
      backgroundColor: BUTTON_COLOR,
      borderColor: BUTTON_COLOR,
      transform: [{ scale: pressScale.get() }],
    };
  }, [disabled]);

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        accessibilityRole="button"
        style={[styles.button, buttonStyle]}
      >
        <Icon size={24} stroke={ICON_COLOR} strokeWidth={2.6} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    width: CONTROL_BUTTON_SIZE,
    height: CONTROL_BUTTON_SIZE,
    borderRadius: CONTROL_BUTTON_SIZE / 2,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
