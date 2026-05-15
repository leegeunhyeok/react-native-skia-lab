import { Skia, TileMode, rect, vec } from '@shopify/react-native-skia';
import type { Canvas2d } from '@/hooks/useCanvas';

export default class Sky {
  private __workletClass = true;
  private paint = Skia.Paint();

  draw({ ctx, window }: Canvas2d) {
    this.paint.setShader(
      Skia.Shader.MakeLinearGradient(
        vec(0, 0),
        vec(window.width * 0.9, window.height * 0.7),
        ['#75A9DD', '#A8D9EF', '#D5F3F7'].map(Skia.Color),
        [0, 0.5, 1],
        TileMode.Clamp,
      ),
    );

    ctx.drawRect(rect(0, 0, window.width, window.height), this.paint);
  }
}
