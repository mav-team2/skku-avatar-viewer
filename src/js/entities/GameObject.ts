import { Container, Sprite, Texture } from 'pixi.js';
import { spriteManager } from '../utils/SpriteManager';

export interface GameObjectData {
  id: string;
  x: number;
  y: number;
  type?: string;
  spriteUrl?: string;  // 전체 URL (예: www.domain.com/objects/coin.png)
  scale?: number;      // 스프라이트 스케일 (기본값: 1.0) - 아바타와 같은 스케일 배수
  rotation?: number;   // 회전 각도 (라디안, 기본값: 0)
}

export class GameObject {
  public readonly id: string;
  public readonly container: Container;

  private sprite!: Sprite; // definite assignment assertion
  private objectType: string;
  private gameContainer: Container;
  private readonly desiredSpriteSize: number = 64; // 원하는 스프라이트 표시 크기 (아바타와 동일)
  private readonly objectScale: number; // 오브젝트 스케일 배수
  private objectRotation: number; // 오브젝트 회전 각도 (라디안)

  private constructor(
    data: GameObjectData,
    gameContainer: Container
  ) {
    this.gameContainer = gameContainer;
    this.id = data.id;
    this.objectType = data.type ?? 'default';
    this.objectScale = data.scale ?? 1.0; // 기본 스케일 1.0배
    this.objectRotation = data.rotation ?? 0; // 기본 회전 0

    // Container 생성
    this.container = new Container();
    this.container.x = data.x;
    this.container.y = data.y;

    // 게임 컨테이너에 추가
    this.gameContainer.addChild(this.container);
  }

  /**
   * 정적 팩토리 메서드 - 스프라이트 로드 후 오브젝트 생성
   */
  static async create(
    data: GameObjectData,
    gameContainer: Container
  ): Promise<GameObject> {
    const gameObject = new GameObject(data, gameContainer);

    // 스프라이트 URL이 있으면 먼저 로드
    if (data.spriteUrl) {
      await gameObject.loadSprite(data.spriteUrl);
    } else {
      // 기본 폴백 스프라이트 로드 시도
      try {
        await gameObject.loadSprite('/assets/objects/default');
      } catch {
        // 폴백 실패 시 플레이스홀더 생성
        gameObject.sprite = gameObject.createDefaultSprite();
        gameObject.container.addChild(gameObject.sprite);
      }
    }

    return gameObject;
  }

  private createDefaultSprite(): Sprite {
    // 기본 청록색 사각형 오브젝트 (폴백 시 사용)
    const sprite = new Sprite(Texture.WHITE);
    sprite.width = 24;
    sprite.height = 24;
    sprite.anchor.set(0.5, 0.5);  // 중심 앵커 (아바타와 일관성)
    sprite.tint = 0x4ecdc4;  // 청록색

    return sprite;
  }

  /**
   * 스프라이트 로드
   * @param url - 전체 URL (예: www.domain.com/objects/coin.png)
   */
  private async loadSprite(url: string): Promise<void> {
    try {
      const texture = await spriteManager.loadTexture(url);
      if (texture) {
        // 스프라이트 생성
        this.sprite = new Sprite(texture);
        this.sprite.anchor.set(0.5, 0.5);  // 중심 앵커 (아바타와 일관성)

        // 아바타와 동일한 스케일 계산: 원하는 크기(64px)에 맞게 스케일 조정
        const originalWidth = texture.width;
        const baseScale = this.desiredSpriteSize / originalWidth;
        const finalScale = baseScale * this.objectScale;

        this.sprite.scale.set(finalScale, finalScale);

        // 회전 적용 (라디안)
        this.sprite.rotation = this.objectRotation;

        this.container.addChild(this.sprite);
        console.log(`[GameObject ${this.id}] Sprite loaded: ${texture.width}x${texture.height}, finalScale: ${finalScale.toFixed(2)}, rotation: ${this.objectRotation.toFixed(2)} rad`);
      }
    } catch (error) {
      console.error(`[GameObject] Failed to load sprite: ${error}`);
      throw error;
    }
  }

  /**
   * 위치 설정
   */
  setPosition(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * 회전 설정 (라디안)
   */
  setRotation(rotation: number): void {
    this.objectRotation = rotation;
    if (this.sprite) {
      this.sprite.rotation = rotation;
    }
  }

  /**
   * 회전 설정 (도)
   */
  setRotationDegrees(degrees: number): void {
    const radians = (degrees * Math.PI) / 180;
    this.setRotation(radians);
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
  get rotation(): number { return this.objectRotation; }
  get rotationDegrees(): number { return (this.objectRotation * 180) / Math.PI; }
}
