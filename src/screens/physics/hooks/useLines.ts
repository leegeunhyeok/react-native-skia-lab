import type { Canvas2d } from '@/hooks/useCanvas';
import { useSharedValue } from 'react-native-reanimated';
import useWorkletClass from '@/hooks/useWorkletClass';
import Eraser, { ERASER_RADIUS } from '../classes/eraser';
import Line from '../classes/line';

export default function useLines() {
  const lines = useSharedValue<Line[]>([]);
  const currentLine = useSharedValue<Line | null>(null);
  const eraser = useWorkletClass(Eraser);

  function addLine(x: number, y: number) {
    'worklet';

    const line = new Line(x, y);
    const items = lines.get();

    items.push(line);
    lines.set(items);
    currentLine.set(line);
  }

  function moveLine(x: number, y: number) {
    'worklet';

    currentLine.get()?.addPoint(x, y);
  }

  function finishLine() {
    'worklet';

    const line = currentLine.get();

    if (line?.isTooShort()) {
      const items = lines.get();

      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i] === line) {
          items.splice(i, 1);
          lines.set(items);
          break;
        }
      }
    }

    currentLine.set(null);
  }

  function eraseLine(x: number, y: number) {
    'worklet';

    const items = lines.get();

    for (let i = items.length - 1; i >= 0; i--) {
      items[i].eraseAt(x, y, ERASER_RADIUS);
    }
  }

  function beginErase(x: number, y: number) {
    'worklet';

    eraser.get()?.begin(x, y);
    eraseLine(x, y);
  }

  function moveErase(x: number, y: number) {
    'worklet';

    eraser.get()?.move(x, y);
    eraseLine(x, y);
  }

  function finishErase() {
    'worklet';

    eraser.get()?.finish();
  }

  function updateLines(dt: number) {
    'worklet';

    const items = lines.get();

    for (let i = items.length - 1; i >= 0; i--) {
      const line = items[i];
      line.update(dt);

      if (line.shouldRemove()) {
        items.splice(i, 1);
      }
    }
  }

  function drawLines(canvas: Canvas2d) {
    'worklet';

    const items = lines.get();

    for (let i = 0; i < items.length; i++) {
      items[i].draw(canvas);
    }
  }

  function drawEraser(canvas: Canvas2d) {
    'worklet';

    eraser.get()?.draw(canvas);
  }

  return {
    addLine,
    beginErase,
    drawEraser,
    drawLines,
    eraseLine,
    finishErase,
    finishLine,
    lines,
    moveErase,
    moveLine,
    updateLines,
  };
}
