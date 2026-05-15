import { Eraser, PencilLine } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ToolToggleButtonProps = {
  bottom: number;
  isErasing: boolean;
  onPress: () => void;
};

export default function ToolToggleButton({
  bottom,
  isErasing,
  onPress,
}: ToolToggleButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.get() }],
    };
  });

  return (
    <AnimatedPressable
      accessibilityLabel={
        isErasing ? 'Switch to line mode' : 'Switch to eraser mode'
      }
      accessibilityRole="button"
      accessibilityState={{ selected: isErasing }}
      onPress={onPress}
      onPressIn={() => {
        scale.set(
          withSpring(0.94, {
            damping: 14,
            mass: 0.42,
            stiffness: 360,
          }),
        );
      }}
      onPressOut={() => {
        scale.set(
          withSpring(1, {
            damping: 10,
            mass: 0.36,
            stiffness: 310,
          }),
        );
      }}
      style={[styles.button, { bottom }, animatedStyle]}
    >
      {isErasing ? (
        <Eraser color="#F3F6F4" size={25} />
      ) : (
        <PencilLine color="#F3F6F4" size={25} />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(104, 123, 116, 0.22)',
    backgroundColor: '#768983',
    shadowColor: '#687B74',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
});
