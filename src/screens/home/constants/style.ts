import { FontSlant, FontWeight, FontWidth } from "@shopify/react-native-skia";
import type { HomeCardStyle, HomeLabelStyle, HomeListStyle } from "../types";

export const BASE_LAYOUT = {
  height: 852,
  width: 393,
} as const; // iPhone 17

export const MIN_LAYOUT_SCALE = 0.78;
export const MAX_LAYOUT_SCALE = 1;

export const CARD_STYLE = {
  height: 180,
  maxParticleProgress: 0.7,
  radius: 32,
  rightInset: 8,
  width: 280,
} satisfies HomeCardStyle;

export const LABEL_STYLE = {
  color: "#FFFFFF",
  fontFamilies: ["SF Pro Rounded", ".SF UI Rounded", "System"],
  fontSize: 18,
  fontStyle: {
    slant: FontSlant.Upright,
    weight: FontWeight.Bold,
    width: FontWidth.Normal,
  },
  gap: 20,
  maxBlur: 7,
  width: 104,
} satisfies HomeLabelStyle;

export const LIST_STYLE = {
  cardRightInset: CARD_STYLE.rightInset,
  gap: 100,
  labelFadeDuration: 150,
  labelFontSize: LABEL_STYLE.fontSize,
  maxParticleProgress: CARD_STYLE.maxParticleProgress,
  minScale: 0.78,
} satisfies Omit<HomeListStyle, "visibleCardLimit" | "visibleScanRadius">;
