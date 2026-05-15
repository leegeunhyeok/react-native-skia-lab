import { Canvas2d } from "@/hooks/useCanvas";
import {
  dist,
  rect,
  Skia,
  SkImage,
  SkPoint,
  SkRect,
  vec,
} from "@shopify/react-native-skia";
import { clamp } from "react-native-reanimated";
import { collide, getSkImageData } from "../utils/util";
import Pixel from "./pixel";

export default class Ripple {
  private __workletClass = true;
  private image: SkImage | null;
  private bounds: SkRect;
  private pos = vec(0, 0);
  private speed = 10;
  private radius = 0;
  private maxRadius = 0;
  private pixels: Pixel[] = [];
  constructor({
    image,
    bounds,
    pixelSize,
  }: {
    image: SkImage | null;
    bounds: SkRect;
    pixelSize: number;
  }) {
    this.image = image;
    this.bounds = bounds;

    if (!image) {
      return;
    }

    const data = getSkImageData(image, bounds);
    const imageDataWidth = Math.max(1, Math.floor(bounds.width));
    const imageDataHeight = Math.max(1, Math.floor(bounds.height));

    const columns = Math.ceil(bounds.width / pixelSize);
    const rows = Math.ceil(bounds.height / pixelSize);

    for (let i = 0; i < rows; i++) {
      const y = (i + 0.5) * pixelSize;
      const sampleY = clamp(Math.floor(y), 0, imageDataHeight - 1);

      for (let j = 0; j < columns; j++) {
        const x = (j + 0.5) * pixelSize;
        const sampleX = clamp(Math.floor(x), 0, imageDataWidth - 1);

        const pixelIndex = (sampleX + sampleY * imageDataWidth) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        const a = data[pixelIndex + 3];

        if (
          r === undefined ||
          g === undefined ||
          b === undefined ||
          a === undefined
        ) {
          continue;
        }

        this.pixels.push(
          new Pixel(x, y, pixelSize, Skia.Color(`rgba(${r}, ${g}, ${b}, ${a})`))
        );
      }
    }
  }

  private getMaxRadius(from: SkPoint) {
    const c1 = dist(vec(0, 0), from);
    const c2 = dist(vec(this.bounds.width, 0), from);
    const c3 = dist(vec(0, this.bounds.height), from);
    const c4 = dist(vec(this.bounds.width, this.bounds.height), from);
    return Math.max(c1, c2, c3, c4);
  }

  ripple(pos: SkPoint) {
    this.pixels.forEach((pixel) => pixel.reset());
    this.pos = pos;
    this.radius = 0;
    this.maxRadius = this.getMaxRadius(pos);
  }

  draw(canvas: Canvas2d) {
    if (!this.image) {
      return;
    }

    const { ctx, window } = canvas;

    ctx.drawImageRect(
      this.image,
      rect(0, 0, this.image.width(), this.image.height()),
      rect(0, 0, window.width, window.height),
      Skia.Paint()
    );

    if (this.radius < this.maxRadius) {
      this.radius += this.speed;
    }

    this.pixels.forEach((pixel) => {
      if (collide(pixel.x, pixel.y, this.pos.x, this.pos.y, this.radius)) {
        pixel.draw(canvas);
      }
    });
  }
}
