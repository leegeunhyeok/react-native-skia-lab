import type { Canvas2d } from "@/hooks/useCanvas";
import { getGlyphRainSurface } from "../utils/util";
import {
  BlurStyle,
  FontSlant,
  FontWeight,
  FontWidth,
  type SkPaint,
  type SkParagraph,
  Skia,
  TextAlign,
  TextDirection,
} from "@shopify/react-native-skia";
import type Sea from "./sea";
import type { SplashSeed } from "./sea";

const WORD = "Beach";
const WORD_SIZE = 86;
const STATE_IDLE = 0;
const STATE_FALLING = 1;
const STATE_SINKING = 2;
const STATE_SPLASHED = 3;

type DropState =
  | typeof STATE_IDLE
  | typeof STATE_FALLING
  | typeof STATE_SINKING
  | typeof STATE_SPLASHED;

type Glyph = {
  char: string;
  paragraph: SkParagraph;
  shadowParagraph: SkParagraph;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  mass: number;
  rotation: number;
  angularVelocity: number;
  state: DropState;
};

type RainBounceSurface = {
  x: number;
  y: number;
  normalX: number;
  normalY: number;
};

const TEXT_COLOR = "rgba(255, 255, 255, 0.96)";
const TEXT_SHADOW_COLOR = "rgba(11, 56, 82, 0.18)";
const GRAVITY = 980;
const AIR_DRAG = 0.998;
const MAX_FRAME_DELTA_SECONDS = 1 / 30;
const GLYPH_DEPTH_GAIN = 0.24;
const GLYPH_COLLISION_RESTITUTION = 0.34;
const GLYPH_COLLISION_STRENGTH = 0.58;

function makeParagraph(text: string, fontSize: number, color: string) {
  "worklet";

  const paragraph = Skia.ParagraphBuilder.Make({
    textAlign: TextAlign.Left,
    textDirection: TextDirection.LTR,
    textStyle: {
      color: Skia.Color(color),
      fontFamilies: ["SF Pro Rounded", ".SF UI Rounded", "System"],
      fontSize,
      fontStyle: {
        weight: FontWeight.Bold,
        width: FontWidth.Normal,
        slant: FontSlant.Upright,
      },
    },
  })
    .addText(text)
    .build();

  paragraph.layout(1000);
  return paragraph;
}

export default class Beach {
  private __workletClass = true;
  private fontSize = WORD_SIZE;
  private fadePaint: SkPaint = Skia.Paint();
  private shadowPaint: SkPaint = Skia.Paint();
  private glyphs: Glyph[] = [];
  private x = 0;
  private y = 0;
  private width = 0;
  private height = 0;
  private isInit = false;
  private lastTimestamp = 0;
  private isStarted = false;

  constructor() {
    this.fadePaint.setAntiAlias(true);
    this.shadowPaint.setAntiAlias(true);
    this.shadowPaint.setMaskFilter(
      Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 8, false)
    );
  }

  private layout(canvas: Canvas2d) {
    if (this.isStarted) {
      return;
    }

    this.fontSize = WORD_SIZE;
    const measured = this.measureWord(WORD_SIZE);
    this.width = measured.width;
    this.height = measured.height;
    this.x = (canvas.window.width - this.width) / 2;
    this.y = (canvas.window.height - this.height) / 2;
    this.glyphs = [];

    let cursorX = this.x;
    for (let i = 0; i < WORD.length; i++) {
      const char = WORD[i];
      const paragraph = makeParagraph(char, this.fontSize, TEXT_COLOR);
      const shadowParagraph = makeParagraph(
        char,
        this.fontSize,
        TEXT_SHADOW_COLOR
      );
      const width = Math.max(
        paragraph.getMaxIntrinsicWidth(),
        this.fontSize * 0.18
      );
      const height = paragraph.getHeight();

      paragraph.layout(width + 2);
      shadowParagraph.layout(width + 2);

      this.glyphs.push({
        char,
        paragraph,
        shadowParagraph,
        x: cursorX,
        y: this.y,
        width,
        height,
        vx: 0,
        vy: 0,
        mass: 1,
        rotation: 0,
        angularVelocity: 0,
        state: STATE_IDLE,
      });

      cursorX += width;
    }

    this.isInit = true;
  }

  private measureWord(fontSize: number) {
    const paragraph = makeParagraph(WORD, fontSize, TEXT_COLOR);
    const width = paragraph.getMaxIntrinsicWidth();
    paragraph.layout(width + 2);

    return {
      width,
      height: paragraph.getHeight(),
    };
  }

  drop(x: number, y: number) {
    if (this.isStarted || !this.isTapped(x, y)) {
      return false;
    }

    this.isStarted = true;

    this.glyphs.forEach((glyph, index) => {
      const direction = index - (this.glyphs.length - 1) / 2;
      glyph.state = STATE_FALLING;
      glyph.mass = 0.72 + Math.random() * 0.9;
      glyph.vx = direction * 13 + (Math.random() - 0.5) * 84;
      glyph.vy = -82 - Math.random() * 124;
      glyph.angularVelocity = (Math.random() - 0.5) * 4.2;
    });

    return true;
  }

  private isTapped(x: number, y: number) {
    const paddingX = this.fontSize * 0.18;
    const paddingY = this.fontSize * 0.12;

    return (
      x >= this.x - paddingX &&
      x <= this.x + this.width + paddingX &&
      y >= this.y - paddingY &&
      y <= this.y + this.height + paddingY
    );
  }

  getRainBounceSurface(
    x: number,
    y: number,
    radius: number
  ): RainBounceSurface | null {
    if (!this.isInit || this.isStarted) {
      return null;
    }

    for (let i = 0; i < this.glyphs.length; i++) {
      const glyph = this.glyphs[i];
      const paddingX = Math.max(2, radius * 1.2);
      const left = glyph.x - paddingX;
      const right = glyph.x + glyph.width + paddingX;

      if (x < left || x > right) {
        continue;
      }

      const surface = getGlyphRainSurface(
        {
          char: glyph.char,
          x: glyph.x,
          y: glyph.y,
          width: glyph.width,
          fontSize: this.fontSize,
        },
        x
      );

      if (!surface) {
        continue;
      }

      const collisionBand = Math.max(radius * 5, this.fontSize * 0.11);
      const bottom = glyph.y + glyph.height - this.fontSize * 0.1 + radius;

      if (
        y + radius < surface.y ||
        y - radius > bottom ||
        y - surface.y > collisionBand
      ) {
        continue;
      }

      return {
        x,
        y: surface.y,
        normalX: surface.normalX,
        normalY: -1,
      };
    }

    return null;
  }

  private move(canvas: Canvas2d, sea: Sea) {
    if (!this.isStarted) {
      this.lastTimestamp = canvas.frameInfo.timestamp;
      return;
    }

    if (!this.lastTimestamp) {
      this.lastTimestamp = canvas.frameInfo.timestamp;
      return;
    }

    const deltaSeconds = Math.min(
      (canvas.frameInfo.timestamp - this.lastTimestamp) / 1000,
      MAX_FRAME_DELTA_SECONDS
    );
    this.lastTimestamp = canvas.frameInfo.timestamp;

    this.glyphs.forEach((glyph) => {
      this.moveGlyph(glyph, sea, deltaSeconds);
    });
    this.resolveGlyphCollisions(deltaSeconds);
  }

  private moveGlyph(
    glyph: Glyph,
    sea: Sea,
    deltaSeconds: number
  ) {
    if (glyph.state === STATE_SPLASHED) {
      return;
    }

    if (glyph.state === STATE_FALLING) {
      glyph.vy += GRAVITY * glyph.mass * deltaSeconds;
      glyph.vx *= AIR_DRAG;
      glyph.x += glyph.vx * deltaSeconds;
      glyph.y += glyph.vy * deltaSeconds;
      glyph.rotation += glyph.angularVelocity * deltaSeconds;

      if (this.splashGlyphOnSurfaceCollision(glyph, sea)) {
        return;
      }

      return;
    }

    if (glyph.state === STATE_SINKING) {
      this.moveSubmergedGlyph(glyph, sea, deltaSeconds);
    }
  }

  private resolveGlyphCollisions(deltaSeconds: number) {
    for (let i = 0; i < this.glyphs.length; i++) {
      const a = this.glyphs[i];

      if (a.state !== STATE_FALLING) {
        continue;
      }

      for (let j = i + 1; j < this.glyphs.length; j++) {
        const b = this.glyphs[j];

        if (b.state !== STATE_FALLING) {
          continue;
        }

        const ax = a.x + a.width / 2;
        const ay = a.y + a.height / 2;
        const bx = b.x + b.width / 2;
        const by = b.y + b.height / 2;
        const dx = bx - ax;
        const dy = by - ay;
        const distance = Math.max(Math.hypot(dx, dy), 0.001);
        const radiusA = Math.max(14, Math.min(a.width, a.height) * 0.43);
        const radiusB = Math.max(14, Math.min(b.width, b.height) * 0.43);
        const minDistance = radiusA + radiusB;

        if (distance >= minDistance) {
          continue;
        }

        const normalX = dx / distance;
        const normalY = dy / distance;
        const overlap = (minDistance - distance) * GLYPH_COLLISION_STRENGTH;
        const pushX = normalX * overlap * 0.5;
        const pushY = normalY * overlap * 0.5;

        a.x -= pushX;
        a.y -= pushY;
        b.x += pushX;
        b.y += pushY;

        const relativeVx = b.vx - a.vx;
        const relativeVy = b.vy - a.vy;
        const separatingVelocity = relativeVx * normalX + relativeVy * normalY;

        if (separatingVelocity > 0) {
          continue;
        }

        const impulse =
          (-separatingVelocity * (1 + GLYPH_COLLISION_RESTITUTION)) /
          (a.mass + b.mass);
        const impulseX = impulse * normalX;
        const impulseY = impulse * normalY;

        a.vx -= impulseX * b.mass;
        a.vy -= impulseY * b.mass;
        b.vx += impulseX * a.mass;
        b.vy += impulseY * a.mass;
        a.angularVelocity -= impulseX * deltaSeconds * 1.8;
        b.angularVelocity += impulseX * deltaSeconds * 1.8;
      }
    }
  }

  private splashGlyphOnSurfaceCollision(glyph: Glyph, sea: Sea) {
    const x = glyph.x + glyph.width / 2;
    const surfaceY = sea.getSurfaceYAt(x);
    const bottomY = this.getGlyphSeaContactY(glyph);

    if (bottomY < surfaceY) {
      return false;
    }

    glyph.state = STATE_SINKING;
    glyph.vx *= 0.26;
    glyph.vy = Math.max(glyph.vy * 0.38, 90);
    glyph.angularVelocity *= 0.24;
    sea.increaseDepth(GLYPH_DEPTH_GAIN);
    sea.splash([this.getGlyphSplashSeed(glyph, sea, surfaceY)]);

    return true;
  }

  private getGlyphSeaContactY(glyph: Glyph) {
    const bottomRatio =
      glyph.char === "B" ? 0.78 : glyph.char === "h" ? 0.74 : 0.7;
    const centerY = glyph.y + glyph.height / 2;
    const localContactY = glyph.height * (bottomRatio - 0.5);

    return centerY + Math.cos(glyph.rotation) * localContactY;
  }

  private moveSubmergedGlyph(
    glyph: Glyph,
    sea: Sea,
    deltaSeconds: number
  ) {
    const x = glyph.x + glyph.width / 2;
    const surfaceY = sea.getSurfaceYAt(x);

    glyph.vx *= 0.9;
    glyph.vy += GRAVITY * 0.18 * deltaSeconds;
    glyph.x += glyph.vx * deltaSeconds;
    glyph.y += glyph.vy * deltaSeconds;
    glyph.rotation += glyph.angularVelocity * deltaSeconds;
    glyph.angularVelocity *= 0.92;

    if (glyph.y >= surfaceY + glyph.height * 0.18) {
      glyph.state = STATE_SPLASHED;
    }
  }

  private getGlyphSplashSeed(
    glyph: Glyph,
    sea: Sea,
    surfaceY = sea.getSurfaceYAt(glyph.x + glyph.width / 2)
  ): SplashSeed {
    const x = glyph.x + glyph.width / 2;

    return {
      x,
      y: surfaceY,
      radius: Math.max(4.2, Math.min(glyph.width, this.height) * 0.34),
      strength: 0.65,
    };
  }

  draw(canvas: Canvas2d, sea: Sea) {
    if (!this.isInit) {
      this.layout(canvas);
    }

    this.move(canvas, sea);

    this.glyphs.forEach((glyph) => {
      if (glyph.state === STATE_SPLASHED) {
        return;
      }

      const paragraph = glyph.paragraph;

      this.fadePaint.setAlphaf(1);

      canvas.ctx.save();
      canvas.ctx.translate(
        glyph.x + glyph.width / 2,
        glyph.y + glyph.height / 2
      );
      canvas.ctx.rotate((glyph.rotation * 180) / Math.PI, 0, 0);

      if (glyph.state === STATE_IDLE) {
        glyph.shadowParagraph.paint(
          canvas.ctx,
          -glyph.width / 2,
          -glyph.height / 2 + this.fontSize * 0.08
        );
      }

      canvas.ctx.saveLayer(this.fadePaint);
      paragraph.paint(canvas.ctx, -glyph.width / 2, -glyph.height / 2);
      canvas.ctx.restore();
      canvas.ctx.restore();
    });
  }
}
