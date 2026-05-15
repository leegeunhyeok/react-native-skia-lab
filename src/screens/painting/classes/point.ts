export class Point {
  private __workletClass = true;
  private fixedY: number;
  private speed: number;
  private cur: number;
  private max: number;
  private boostMax = 0;
  private boostSpeed = 0;
  x: number;
  y: number;
  constructor(index: number, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.fixedY = y;
    this.speed = 0.05;
    this.cur = index;
    this.max = Math.random() * 10 + 10;
  }

  update() {
    this.boostMax *= 0.965;
    this.boostSpeed *= 0.94;
    this.cur += this.speed + this.boostSpeed;
    this.y = this.fixedY + Math.sin(this.cur) * (this.max + this.boostMax);
  }

  setFixedY(y: number) {
    this.fixedY = y;
    this.y = y;
  }

  disturb(strength: number, direction: number) {
    this.boostMax = Math.min(this.boostMax + strength, this.max * 1.25);
    this.boostSpeed = Math.min(this.boostSpeed + strength * 0.0015, 0.035);
    this.cur += direction * Math.min(strength * 0.018, 0.22);
  }
}
