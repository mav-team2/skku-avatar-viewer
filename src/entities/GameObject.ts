import { Container, Sprite, Texture } from 'pixi.js';
import { spriteManager } from '../utils/SpriteManager';

export interface GameObjectData {
  id: string;
  x: number;
  y: number;
  type?: string;
  spriteUrl?: string;  // 전체 URL (예: www.domain.com/objects/coin.png)
}

export class GameObject {
  public readonly id: string;
  public readonly container: Container;

  private sprite: Sprite;
  private objectType: string;
  private gameContainer: Container;

  constructor(
    data: GameObjectData,
    gameContainer: Container
  ) {
    this.gameContainer = gameContainer;
    this.id = data.id;
    this.objectType = data.type ?? 'default';

    // Container 생성
    this.container = new Container();
    this.container.x = data.x;
    this.container.y = data.y;

    // 기본 스프라이트 (플레이스홀더)
    this.sprite = this.createDefaultSprite();
    this.container.addChild(this.sprite);

    // 게임 컨테이너에 추가
    this.gameContainer.addChild(this.container);

    // 스프라이트 URL이 있으면 로드
    if (data.spriteUrl) {
      this.loadSprite(data.spriteUrl);
    }
  }

  private createDefaultSprite(): Sprite {
    // 기본 녹색 사각형 오브젝트
    const sprite = new Sprite(Texture.WHITE);
    sprite.width = 24;
    sprite.height = 24;
    sprite.anchor.set(0.5, 1);
    sprite.tint = 0x4ecdc4;  // 청록색

    return sprite;
  }

  /**
   * 스프라이트 로드
   * @param url - 전체 URL (예: www.domain.com/objects/coin.png)
   */
  async loadSprite(url: string): Promise<void> {
    try {
      const texture = await spriteManager.loadTexture(url);
      if (texture) {
        this.updateTexture(texture);
        console.log(`[GameObject] Sprite loaded for ${this.id}`);
      }
    } catch (error) {
      console.error(`[GameObject] Failed to load sprite: ${error}`);
    }
  }

  private updateTexture(texture: Texture): void {
    this.sprite.texture = texture;
    this.sprite.width = texture.width;
    this.sprite.height = texture.height;
  }

  /**
   * 위치 설정
   */
  setPosition(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * 오브젝트 픽업 애니메이션 (간단한 페이드아웃)
   */
  async pickup(): Promise<void> {
    return new Promise((resolve) => {
      const fadeOut = () => {
        this.container.alpha -= 0.1;
        if (this.container.alpha <= 0) {
          resolve();
        } else {
          requestAnimationFrame(fadeOut);
        }
      };
      fadeOut();
    });
  }

  destroy(): void {
    this.gameContainer.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  // Getters
  get x(): number { return this.container.x; }
  get y(): number { return this.container.y; }
  get type(): string { return this.objectType; }
}
