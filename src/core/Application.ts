import * as PIXI from 'pixi.js';
import { SpriteObject } from '@entities/SpriteObject';

export class Application {
  private app: PIXI.Application | null = null;
  private sprites: SpriteObject[] = [];

  public init(): void {
    this.createApp();
    this.setupEventListeners();
    this.createSprites(10);
    this.startGameLoop();
  }

  private createApp(): void {
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a1a,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });

    document.body.appendChild(this.app.view as HTMLCanvasElement);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
  }

  private createSprites(count: number): void {
    if (!this.app) return;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.app.screen.width;
      const y = Math.random() * this.app.screen.height;
      const size = 50 + Math.random() * 50;
      
      const sprite = new SpriteObject(this.app, x, y, size, size);
      this.sprites.push(sprite);
    }
  }

  private startGameLoop(): void {
    if (!this.app) return;

    this.app.ticker.add((delta) => {
      this.sprites.forEach(sprite => sprite.update(delta));
    });
  }

  private handleResize(): void {
    if (!this.app) return;
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
  }

  public destroy(): void {
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites = [];
    
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true, baseTexture: true });
      this.app = null;
    }
  }
}
