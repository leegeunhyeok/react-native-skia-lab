import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import type { CarouselLabelFrame } from "../components/label";
import type { HomeLabelStyle } from "../types";
import {
  findLabelFrame,
  getLabelBlur,
  getLabelOpacity,
  getLabelTransform,
  getLabelX,
  getLabelY,
} from "../utils/label-transition";

type Params = {
  readonly frames: SharedValue<CarouselLabelFrame[]>;
  readonly itemIndex: number;
  readonly style: HomeLabelStyle;
};

export default function useLabelTransition({
  frames,
  itemIndex,
  style,
}: Params) {
  const x = useDerivedValue(() => {
    return getLabelX(findLabelFrame(frames.value, itemIndex), style);
  }, [frames, itemIndex, style]);

  const y = useDerivedValue(() => {
    return getLabelY(findLabelFrame(frames.value, itemIndex), style);
  }, [frames, itemIndex, style]);

  const blur = useDerivedValue(() => {
    return getLabelBlur(findLabelFrame(frames.value, itemIndex), style);
  }, [frames, itemIndex, style]);

  const opacity = useDerivedValue(() => {
    return getLabelOpacity(findLabelFrame(frames.value, itemIndex));
  }, [frames, itemIndex]);

  const transform = useDerivedValue(() => {
    return getLabelTransform(findLabelFrame(frames.value, itemIndex));
  }, [frames, itemIndex]);

  return {
    blur,
    opacity,
    transform,
    x,
    y,
  };
}
