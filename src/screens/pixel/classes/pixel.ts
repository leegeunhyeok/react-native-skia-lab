import { Canvas2d } from "@/hooks/useCanvas";
import { rect, SkColor, Skia } from "@shopify/react-native-skia";

const BOUNCE = 0.76;

export default class Pixel {
  private __workletClass = true;
  x: number;
  y: number;
  private pixelSize = 0;
  private targetSize: number;
  private velocity = 0;
  private paint = Skia.Paint();
  constructor(x: number, y: number, targetSize: number, color: SkColor) {
    this.x = x;
    this.y = y;
    this.targetSize = targetSize;
    this.paint.setColor(color);
  }

  reset() {
    this.pixelSize = 0;
    this.velocity = 0;
  }

  draw({ ctx }: Canvas2d) {
    ctx.drawRect(
      rect(
        this.x - this.targetSize / 2,
        this.y - this.targetSize / 2,
        this.targetSize,
        this.targetSize
      ),
      Skia.Paint()
    );

    this.velocity += (this.targetSize - this.pixelSize) * 0.5;
    this.velocity *= BOUNCE;
    this.pixelSize += this.velocity;

    ctx.drawCircle(this.x, this.y, this.pixelSize / 2.2, this.paint);
  }
}
