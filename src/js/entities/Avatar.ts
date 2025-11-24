import { Container, AnimatedSprite } from 'pixi.js';
import { spriteManager, type SpriteSet, type SpriteAction } from '../utils/SpriteManager';

export interface AvatarData {
  id: string;
  x: number;
  y: number;
  name?: string;
  spriteUrl?: string;  // www.domain.com/{avatar_id} 형식
  scale?: number;      // 스프라이트 스케일 (기본값: 1.0)
}

export class Avatar {
  public readonly id: string;
  public readonly container: Container;

  private sprite!: AnimatedSprite; // definite assignment assertion
  private spriteSet: SpriteSet | null = null;
  private currentAction: SpriteAction = 'stand';

  // 위치 및 이동 상태
  private currentX: number;
  private currentY: number;
  private targetX: number;
  private targetY: number;
  private isMoving: boolean = false;

  // 애니메이션 설정
  private readonly moveSpeed: number = 2; // 픽셀/프레임 (60fps 기준)
  private readonly stopThreshold: number = 1;
  private readonly desiredSpriteSize: number = 64; // 원하는 스프라이트 표시 크기
  private readonly avatarScale: number; // 아바타 전체 스케일

  // 게임 컨테이너 참조
  private gameContainer: Container;

  private constructor(
    data: AvatarData,
    gameContainer: Container
  ) {
    this.gameContainer = gameContainer;
    this.id = data.id;
    this.currentX = data.x;
    this.currentY = data.y;
    this.targetX = data.x;
    this.targetY = data.y;
    this.avatarScale = data.scale ?? 1.5; // 기본 스케일 1.5배

    // Container 생성
    this.container = new Container();
    this.container.x = data.x;
    this.container.y = data.y;

    // 게임 컨테이너에 추가
    this.gameContainer.addChild(this.container);
  }

  /**
   * 정적 팩토리 메서드 - 스프라이트 로드 후 아바타 생성
   */
  static async create(
    data: AvatarData,
    gameContainer: Container
  ): Promise<Avatar> {
    const avatar = new Avatar(data, gameContainer);

    // 스프라이트 먼저 로드
    const spriteUrl = data.spriteUrl ?? '/assets/avatars/default';
    await avatar.loadSprites(spriteUrl);

    return avatar;
  }

  /**
   * 스프라이트 세트 로드
   * URL 형식: www.domain.com/{avatar_id}
   */
  private async loadSprites(baseUrl: string): Promise<void> {
    try {
      this.spriteSet = await spriteManager.loadSpriteSet(baseUrl);

      // stand 텍스처로 초기화
      const standTextures = spriteManager.getActionTextures(this.spriteSet, 'stand');
      if (standTextures && standTextures.length > 0) {
        // 스프라이트 생성 및 매트릭스 스케일 적용
        this.sprite = new AnimatedSprite(standTextures);
        this.sprite.anchor.set(0.5, 0.5);

        // 매트릭스를 사용해 스케일 직접 적용
        const originalWidth = standTextures[0].width;
        const baseScale = this.desiredSpriteSize / originalWidth;
        const finalScale = baseScale * this.avatarScale;

        this.sprite.scale.set(finalScale, finalScale);

        // 애니메이션 설정
        this.sprite.animationSpeed = 0.15;
        this.sprite.loop = true;
        this.sprite.play();

        this.container.addChild(this.sprite);
        console.log(`[Avatar ${this.id}] Sprites loaded, scale: ${finalScale.toFixed(2)}`);
      }
    } catch (error) {
      console.error(`[Avatar] Failed to load sprites: ${error}`);
      throw error;
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
   * 매 프레임 업데이트 - 일정한 속도로 이동 및 애니메이션 자동 전환
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
      // 일정한 속도로 이동 (방향 벡터 정규화)
      const dirX = dx / distance;
      const dirY = dy / distance;

      // deltaTime을 고려한 이동 거리 계산
      const moveDistance = this.moveSpeed * deltaTime;

      // 목표 지점을 넘어가지 않도록 체크
      if (moveDistance >= distance) {
        // 목표 지점에 도달
        this.currentX = this.targetX;
        this.currentY = this.targetY;
      } else {
        // 일정한 속도로 이동
        this.currentX += dirX * moveDistance;
        this.currentY += dirY * moveDistance;
      }

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
    
    this.currentAction = action;
    this.playAnimation(action);
  }

  private playAnimation(action: SpriteAction): void {
    if (!this.spriteSet) return;

    const textures = spriteManager.getActionTextures(this.spriteSet, action);
    if (textures && textures.length > 0) {
      // 현재 스케일 값 보존 (방향 포함)
      const currentScaleX = this.sprite.scale.x;
      const currentScaleY = this.sprite.scale.y;

      // 애니메이션 정지
      this.sprite.stop();

      // 텍스처 교체
      this.sprite.textures = textures;

      // 애니메이션 속도 및 설정
      if (action === 'walk') {
        this.sprite.animationSpeed = 0.2;
      } else if (action === 'run') {
        this.sprite.animationSpeed = 0.3;
      } else {
        // stand (Idle)
        this.sprite.animationSpeed = 0.15;
      }

      // 루프 설정 및 재생
      this.sprite.loop = true;
      this.sprite.gotoAndPlay(0);

      // 스케일 복원 (이미 초기화 시 적용된 스케일 유지)
      this.sprite.scale.set(currentScaleX, currentScaleY);

      console.log(`[Avatar ${this.id}] Playing animation: ${action} (${textures.length} frames)`);
    }
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
