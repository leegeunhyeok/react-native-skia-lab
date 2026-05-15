import { PI2 } from "@/constants/math";
import { Path, Skia } from "@shopify/react-native-skia";
import { SharedValue, useDerivedValue } from "react-native-reanimated";

type Props = {
  size: SharedValue<number>;
  sides: SharedValue<number>;
};

const START_ANGLE = -PI2 / 4;

export default function Polygon({ size, sides }: Props) {
  const path = useDerivedValue(() => {
    "worklet";

    const angle = PI2 / sides.get();
    const path = Skia.Path.Make();

    for (let i = 0; i < sides.get(); i++) {
      const vertexAngle = angle * i + START_ANGLE;
      const x = size.get() * Math.cos(vertexAngle);
      const y = size.get() * Math.sin(vertexAngle);
      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    path.close();

    return path;
  });

  return <Path path={path} color="#3E2C23" />;
}
