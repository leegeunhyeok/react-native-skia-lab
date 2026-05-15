import {
  Blur,
  Group,
  Paint,
  Paragraph,
  Skia,
  TextAlign,
  TextDirection,
  type Transforms3d,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { HomeLabelStyle } from "../types";

export type CarouselLabelFrame = {
  readonly blurBoost: number;
  readonly cardCenterX: number;
  readonly cardWidth: number;
  readonly centerY: number;
  readonly itemIndex: number;
  readonly opacity: number;
  readonly particleProgressRatio: number;
  readonly translateX: number;
};

type Props = {
  readonly blur: SharedValue<number>;
  readonly opacity: SharedValue<number>;
  readonly style: HomeLabelStyle;
  readonly text: string;
  readonly transform: SharedValue<Transforms3d>;
  readonly x: SharedValue<number>;
  readonly y: SharedValue<number>;
};

export default function Label({
  blur,
  opacity,
  style,
  text,
  transform,
  x,
  y,
}: Props) {
  const paragraph = useMemo(() => {
    const nextParagraph = Skia.ParagraphBuilder.Make({
      maxLines: 1,
      textAlign: TextAlign.Right,
      textDirection: TextDirection.LTR,
      textStyle: {
        color: Skia.Color(style.color),
        fontFamilies: [...style.fontFamilies],
        fontSize: style.fontSize,
        fontStyle: style.fontStyle,
      },
    })
      .addText(text)
      .build();

    nextParagraph.layout(style.width);
    return nextParagraph;
  }, [style, text]);

  return (
    <Group
      layer={
        <Paint>
          <Blur blur={blur} mode="decal" />
        </Paint>
      }
      opacity={opacity}
      transform={transform}
    >
      <Paragraph paragraph={paragraph} x={x} y={y} width={style.width} />
    </Group>
  );
}
