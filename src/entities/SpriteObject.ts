import * as PIXI from 'pixi.js';

interface Velocity {
  x: number;
  y: number;
}

export class SpriteObject {
  private app: PIXI.Application;
  private sprite: PIXI.Sprite | null = null;
  private velocity: Velocity;

  constructor(app: PIXI.Application, x: number, y: number, width = 100, height = 100) {
    this.app = app;
    this.velocity = {
      x: Math.random() * 4 - 2,
      y: Math.random() * 4 - 2
    };
    
    this.createGraphics(x, y, width, height);
  }

  private createGraphics(x: number, y: number, width: number, height: number): void {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(Math.random() * 0xFFFFFF);
    graphics.drawRect(0, 0, width, height);
    graphics.endFill();

    const texture = this.app.renderer.generateTexture(graphics);
    this.sprite = new PIXI.Sprite(texture);
    
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.anchor.set(0.5);

    this.app.stage.addChild(this.sprite);
  }

  public update(delta: number): void {
    if (!this.sprite) return;

    // 위치 업데이트
    this.sprite.x += this.velocity.x * delta;
    this.sprite.y += this.velocity.y * delta;

    // 화면 경계 충돌 처리
    this.handleBoundaryCollision();

    // 회전 애니메이션
    this.sprite.rotation += 0.01 * delta;
  }

  private handleBoundaryCollision(): void {
    if (!this.sprite) return;

    const bounds = this.app.screen;
    
    if (this.sprite.x <= 0 || this.sprite.x >= bounds.width) {
      this.velocity.x *= -1;
      this.sprite.x = Math.max(0, Math.min(bounds.width, this.sprite.x));
    }
    
    if (this.sprite.y <= 0 || this.sprite.y >= bounds.height) {
      this.velocity.y *= -1;
      this.sprite.y = Math.max(0, Math.min(bounds.height, this.sprite.y));
    }
  }

  public destroy(): void {
    if (this.sprite) {
      this.app.stage.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
