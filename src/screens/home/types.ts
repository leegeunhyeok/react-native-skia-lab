import type {
  FontSlant,
  FontWeight,
  FontWidth,
} from "@shopify/react-native-skia";

export type HomeRoute = {
  readonly label: string;
  readonly href: string;
  readonly image: number;
};

export type HomeCardStyle = {
  readonly width: number;
  readonly height: number;
  readonly radius: number;
  readonly maxParticleProgress: number;
  readonly rightInset: number;
};

export type HomeLabelStyle = {
  readonly color: string;
  readonly fontFamilies: readonly string[];
  readonly fontSize: number;
  readonly fontStyle: {
    readonly slant?: FontSlant;
    readonly weight?: FontWeight;
    readonly width?: FontWidth;
  };
  readonly gap: number;
  readonly maxBlur: number;
  readonly width: number;
};

export type HomeListStyle = {
  readonly cardRightInset: number;
  readonly gap: number;
  readonly labelFadeDuration: number;
  readonly labelFontSize: number;
  readonly maxParticleProgress: number;
  readonly minScale: number;
  readonly visibleCardLimit: number;
  readonly visibleScanRadius: number;
};
