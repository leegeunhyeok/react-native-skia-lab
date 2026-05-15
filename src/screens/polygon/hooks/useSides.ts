import { useCallback } from "react";
import { useSharedValue } from "react-native-reanimated";

export default function useSides(minSides: number, maxSides: number) {
  const sides = useSharedValue(minSides);

  const increaseSides = useCallback(() => {
    "worklet";

    const current = sides.get();

    if (current >= maxSides) {
      return false;
    }

    sides.set(current + 1);
    return true;
  }, [maxSides, sides]);

  const decreaseSides = useCallback(() => {
    "worklet";

    const current = sides.get();

    if (current <= minSides) {
      return false;
    }

    sides.set(current - 1);
    return true;
  }, [minSides, sides]);

  return { sides, increaseSides, decreaseSides };
}
