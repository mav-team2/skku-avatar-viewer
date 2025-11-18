import { Sprite, Texture, Container, Assets } from 'pixi.js';

export interface GameObjectData {
  id: string;
  x: number;
  y: number;
  type: string;
  spriteUrl?: string; // URL for object sprite
}

export class GameObject {
  public id: string;
  public sprite: Sprite;
  public data: GameObjectData;
  private container: Container;

  constructor(data: GameObjectData, container: Container) {
    this.id = data.id;
    this.data = data;
    this.container = container;

    // Create sprite with a default texture (placeholder)
    this.sprite = new Sprite(Texture.WHITE);
    this.sprite.width = 32;
    this.sprite.height = 32;
    this.sprite.tint = 0x00ff00; // Green color for objects
    this.sprite.anchor.set(0.5, 0.5);

    // Set position
    this.sprite.x = data.x;
    this.sprite.y = data.y;

    // Add to container
    this.container.addChild(this.sprite);

    // Load sprite if URL provided
    if (data.spriteUrl) {
      this.loadSprite(data.spriteUrl);
    }
  }

  private async loadSprite(spriteUrl: string): Promise<void> {
    try {
      console.log(`Loading sprite for object ${this.id} from ${spriteUrl}`);
      const texture = await Assets.load(spriteUrl);

      if (texture) {
        this.sprite.texture = texture;
        // Preserve size ratio
        const scale = Math.min(32 / this.sprite.width, 32 / this.sprite.height);
        this.sprite.scale.set(scale);
      }
    } catch (error) {
      console.error(`Failed to load sprite for object ${this.id}:`, error);
    }
  }

  updatePosition(x: number, y: number): void {
    this.data.x = x;
    this.data.y = y;
    this.sprite.x = x;
    this.sprite.y = y;
  }

  destroy(): void {
    this.container.removeChild(this.sprite);
    this.sprite.destroy();
  }
}
