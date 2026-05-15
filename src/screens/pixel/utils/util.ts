import {
  dist,
  rect,
  Skia,
  SkImage,
  SkRect,
  vec,
} from "@shopify/react-native-skia";

export const getSkImageData = (image: SkImage, bounds: SkRect): number[] => {
  "worklet";

  const width = Math.max(1, Math.floor(bounds.width));
  const height = Math.max(1, Math.floor(bounds.height));

  const offscreen = Skia.Surface.MakeOffscreen(width, height)!;
  const canvas = offscreen.getCanvas();

  canvas.drawImageRect(
    image,
    rect(0, 0, image.width(), image.height()),
    rect(0, 0, width, height),
    Skia.Paint()
  );

  const rawData = canvas.readPixels(bounds.x, bounds.y, {
    alphaType: image.getImageInfo().alphaType,
    colorType: image.getImageInfo().colorType,
    width,
    height,
  });

  offscreen.flush();

  return rawData ? Array.from(rawData) : [];
};

export const collide = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number
) => {
  "worklet";

  return dist(vec(x1, y1), vec(x2, y2)) <= radius;
};
