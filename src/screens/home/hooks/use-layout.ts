import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { clamp } from "react-native-reanimated";
import {
  BASE_LAYOUT,
  CARD_STYLE,
  LABEL_STYLE,
  LIST_STYLE,
  MAX_LAYOUT_SCALE,
  MIN_LAYOUT_SCALE,
} from "../constants/style";
import type { HomeCardStyle, HomeLabelStyle, HomeListStyle } from "../types";
import { scaleLength } from "../utils/utils";

type Layout = {
  readonly cardStyle: HomeCardStyle;
  readonly labelStyle: HomeLabelStyle;
  readonly listStyle: HomeListStyle;
};

export default function useLayout(): Layout {
  const window = useWindowDimensions();

  return useMemo(() => {
    const scale = clamp(
      Math.min(
        window.width / BASE_LAYOUT.width,
        window.height / BASE_LAYOUT.height
      ),
      MIN_LAYOUT_SCALE,
      MAX_LAYOUT_SCALE
    );
    const cardStyle: HomeCardStyle = {
      ...CARD_STYLE,
      height: scaleLength(CARD_STYLE.height, scale),
      radius: scaleLength(CARD_STYLE.radius, scale),
      rightInset: scaleLength(CARD_STYLE.rightInset, scale),
      width: scaleLength(CARD_STYLE.width, scale),
    };
    const labelStyle: HomeLabelStyle = {
      ...LABEL_STYLE,
      fontSize: scaleLength(LABEL_STYLE.fontSize, scale),
      gap: scaleLength(LABEL_STYLE.gap, scale),
      maxBlur: scaleLength(LABEL_STYLE.maxBlur, scale),
      width: scaleLength(LABEL_STYLE.width, scale),
    };
    const listGap = scaleLength(LIST_STYLE.gap, scale);
    const spacing = cardStyle.height + listGap;
    const visibleCardLimit = Math.max(1, Math.ceil(window.height / spacing));
    const listStyle: HomeListStyle = {
      ...LIST_STYLE,
      cardRightInset: cardStyle.rightInset,
      gap: listGap,
      labelFontSize: labelStyle.fontSize,
      visibleCardLimit,
      visibleScanRadius: Math.max(1, Math.ceil(visibleCardLimit / 2) + 1),
    };

    return {
      cardStyle,
      labelStyle,
      listStyle,
    };
  }, [window.height, window.width]);
}
