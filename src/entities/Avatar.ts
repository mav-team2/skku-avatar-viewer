import { Sprite, Texture, Container } from 'pixi.js';
import { SpriteManager, type SpriteSet, type SpriteAction } from '../utils/SpriteManager';

export interface AvatarData {
  id: string;
  x: number;
  y: number;
  name?: string;
  velocity?: { x: number; y: number };
  spriteUrl?: string; // Base URL for sprite assets
}

export class Avatar {
  public id: string;
  public sprite: Sprite;
  public data: AvatarData;
  private container: Container;
  private targetX: number;
  private targetY: number;
  private moveSpeed: number = 200; // pixels per second
  private spriteSet: SpriteSet | null = null;
  private currentAction: SpriteAction = 'stand';
  private spriteManager: SpriteManager;
  private isMoving: boolean = false;

  constructor(data: AvatarData, container: Container) {
    this.id = data.id;
    this.data = data;
    this.container = container;
    this.targetX = data.x;
    this.targetY = data.y;
    this.spriteManager = SpriteManager.getInstance();

    // Create sprite with a default texture (placeholder)
    this.sprite = new Sprite(Texture.WHITE);
    this.sprite.width = 48;
    this.sprite.height = 48;
    this.sprite.tint = 0xff0000; // Red color for avatars
    this.sprite.anchor.set(0.5, 0.5);

    // Set position
    this.sprite.x = data.x;
    this.sprite.y = data.y;

    // Add to container
    this.container.addChild(this.sprite);

    // Load sprites if URL provided
    if (data.spriteUrl) {
      this.loadSprites(data.spriteUrl);
    }
  }

  private async loadSprites(spriteUrl: string): Promise<void> {
    try {
      console.log(`Loading sprites for avatar ${this.id} from ${spriteUrl}`);
      this.spriteSet = await this.spriteManager.loadSpriteSet(spriteUrl);

      // Update sprite with loaded texture
      const standTexture = this.spriteManager.getActionTexture(this.spriteSet, 'stand');
      if (standTexture) {
        this.sprite.texture = standTexture;
        // Preserve size ratio
        const scale = Math.min(48 / this.sprite.width, 48 / this.sprite.height);
        this.sprite.scale.set(scale);
      }
    } catch (error) {
      console.error(`Failed to load sprites for avatar ${this.id}:`, error);
    }
  }

  moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  update(deltaTime: number): void {
    const dx = this.targetX - this.sprite.x;
    const dy = this.targetY - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const wasMoving = this.isMoving;

    if (distance > 1) {
      this.isMoving = true;
      const moveDistance = this.moveSpeed * deltaTime;
      const ratio = Math.min(moveDistance / distance, 1);

      this.sprite.x += dx * ratio;
      this.sprite.y += dy * ratio;

      this.data.x = this.sprite.x;
      this.data.y = this.sprite.y;

      // Switch to walk animation when moving
      if (!wasMoving) {
        this.setAction('walk');
      }
    } else {
      this.isMoving = false;

      // Switch to stand animation when stopped
      if (wasMoving) {
        this.setAction('stand');
      }
    }
  }

  setAction(action: SpriteAction): void {
    if (this.currentAction === action || !this.spriteSet) {
      return;
    }

    const texture = this.spriteManager.getActionTexture(this.spriteSet, action);
    if (texture) {
      this.currentAction = action;
      const currentScale = this.sprite.scale.x;
      this.sprite.texture = texture;
      this.sprite.scale.set(currentScale); // Preserve scale
      console.log(`Avatar ${this.id} action changed to: ${action}`);
    }
  }

  setPosition(x: number, y: number): void {
    this.sprite.x = x;
    this.sprite.y = y;
    this.targetX = x;
    this.targetY = y;
    this.data.x = x;
    this.data.y = y;
  }

  pickupObject(objectId: string): void {
    console.log(`Avatar ${this.id} picked up object ${objectId}`);
    // Could trigger a pickup animation here
  }

  getCurrentAction(): SpriteAction {
    return this.currentAction;
  }

  hasSpriteSet(): boolean {
    return this.spriteSet !== null;
  }

  destroy(): void {
    this.container.removeChild(this.sprite);
    this.sprite.destroy();
  }
}
