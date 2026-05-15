import { Group } from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import useLabelTransition from "../hooks/use-label-transition";
import type { HomeCardStyle, HomeLabelStyle } from "../types";
import Card, { type CarouselCardFrame } from "./card";
import Label, { type CarouselLabelFrame } from "./label";

type Props = {
  readonly cardFrames: SharedValue<CarouselCardFrame[]>;
  readonly cardStyle: HomeCardStyle;
  readonly frameTimestamp: SharedValue<number>;
  readonly image: number;
  readonly itemIndex: number;
  readonly label: string;
  readonly labelFrames: SharedValue<CarouselLabelFrame[]>;
  readonly labelStyle: HomeLabelStyle;
};

export default function ListItem({
  cardFrames,
  cardStyle,
  frameTimestamp,
  image,
  itemIndex,
  label,
  labelFrames,
  labelStyle,
}: Props) {
  const { blur, opacity, transform, x, y } = useLabelTransition({
    frames: labelFrames,
    itemIndex,
    style: labelStyle,
  });

  return (
    <Group>
      <Card
        frames={cardFrames}
        image={image}
        itemIndex={itemIndex}
        style={cardStyle}
        timestamp={frameTimestamp}
      />
      <Label
        blur={blur}
        opacity={opacity}
        style={labelStyle}
        text={label}
        transform={transform}
        x={x}
        y={y}
      />
    </Group>
  );
}
