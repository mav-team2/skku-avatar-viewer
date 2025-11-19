import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import { spriteManager, type SpriteSet, type SpriteAction } from '../utils/SpriteManager';

export interface AvatarData {
  id: string;
  x: number;
  y: number;
  name?: string;
  spriteUrl?: string;  // www.domain.com/{avatar_id} 형식
}

export class Avatar {
  public readonly id: string;
  public readonly container: Container;

  private sprite: Sprite;
  private spriteSet: SpriteSet | null = null;
  private currentAction: SpriteAction = 'stand';

  // 위치 및 이동 상태
  private currentX: number;
  private currentY: number;
  private targetX: number;
  private targetY: number;
  private isMoving: boolean = false;

  // 애니메이션 설정
  private readonly moveSpeed: number = 0.15;
  private readonly stopThreshold: number = 1;

  // 게임 컨테이너 참조
  private gameContainer: Container;

  constructor(
    data: AvatarData,
    gameContainer: Container
  ) {
    this.gameContainer = gameContainer;
    this.id = data.id;
    this.currentX = data.x;
    this.currentY = data.y;
    this.targetX = data.x;
    this.targetY = data.y;

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
      this.loadSprites(data.spriteUrl);
    }
  }

  private createDefaultSprite(): Sprite {
    const graphics = new Graphics();
    graphics.rect(-16, -48, 32, 48);
    graphics.fill(0xff6b6b);  // 빨간색 아바타

    // Graphics를 Sprite로 변환하기 위해 임시 텍스처 사용
    const sprite = new Sprite(Texture.WHITE);
    sprite.width = 32;
    sprite.height = 48;
    sprite.anchor.set(0.5, 1);
    sprite.tint = 0xff6b6b;

    return sprite;
  }

  /**
   * 스프라이트 세트 로드
   * URL 형식: www.domain.com/{avatar_id}
   */
  async loadSprites(baseUrl: string): Promise<void> {
    try {
      this.spriteSet = await spriteManager.loadSpriteSet(baseUrl);

      // stand 텍스처로 초기화
      const standTexture = spriteManager.getActionTexture(this.spriteSet, 'stand');
      if (standTexture) {
        this.updateTexture(standTexture);
      }

      console.log(`[Avatar] Sprites loaded for ${this.id}`);
    } catch (error) {
      console.error(`[Avatar] Failed to load sprites: ${error}`);
    }
  }

  /**
   * 목표 위치로 이동 설정
   */
  moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;

    // 방향에 따라 스프라이트 방향 전환
    if (x < this.currentX) {
      this.setDirection('left');
    } else if (x > this.currentX) {
      this.setDirection('right');
    }
  }

  /**
   * 즉시 위치 변경 (보간 없이)
   */
  setPosition(x: number, y: number): void {
    this.currentX = x;
    this.currentY = y;
    this.targetX = x;
    this.targetY = y;
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * 매 프레임 업데이트 - 이동 보간 및 애니메이션 자동 전환
   */
  update(deltaTime: number): void {
    // 목표까지의 거리 계산
    const dx = this.targetX - this.currentX;
    const dy = this.targetY - this.currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 이동 중 여부 확인
    const wasMoving = this.isMoving;
    this.isMoving = distance > this.stopThreshold;

    if (this.isMoving) {
      // 선형 보간으로 부드러운 이동
      const speed = this.moveSpeed * deltaTime;
      this.currentX += dx * speed;
      this.currentY += dy * speed;

      // Container 위치 업데이트
      this.container.x = this.currentX;
      this.container.y = this.currentY;

      // 이동 상태로 전환 → walk 애니메이션
      if (!wasMoving) {
        this.setAction('walk');
      }
    } else {
      // 정지 상태로 전환 → stand 애니메이션
      if (wasMoving) {
        this.setAction('stand');
      }
    }
  }

  /**
   * 수동 애니메이션 변경
   */
  setAction(action: SpriteAction): void {
    if (this.currentAction === action) return;
    if (!this.spriteSet) {
      this.currentAction = action;
      return;
    }

    const texture = spriteManager.getActionTexture(this.spriteSet, action);
    if (texture) {
      this.currentAction = action;
      this.updateTexture(texture);
      console.log(`[Avatar ${this.id}] Action: ${action}`);
    }
  }

  private updateTexture(texture: Texture): void {
    const previousScale = { x: this.sprite.scale.x, y: this.sprite.scale.y };
    this.sprite.texture = texture;
    this.sprite.scale.set(previousScale.x, previousScale.y);
    // 실제 텍스처 크기에 맞춰 리셋
    this.sprite.width = texture.width;
    this.sprite.height = texture.height;
  }

  /**
   * 스프라이트 방향 전환 (좌/우)
   */
  setDirection(direction: 'left' | 'right'): void {
    this.sprite.scale.x = direction === 'left' ? -Math.abs(this.sprite.scale.x) : Math.abs(this.sprite.scale.x);
  }

  destroy(): void {
    this.gameContainer.removeChild(this.container);
    this.container.destroy({ children: true });
  }

  // Getters
  get x(): number { return this.currentX; }
  get y(): number { return this.currentY; }
  get action(): SpriteAction { return this.currentAction; }
}
