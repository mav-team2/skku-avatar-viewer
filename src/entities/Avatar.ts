import { Container, AnimatedSprite, Texture } from 'pixi.js';
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

  private sprite: AnimatedSprite;
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
    } else {
      // 테스트용 기본 아바타 로드
      this.loadSprites('/assets/avatars/default');
    }
  }

  private createDefaultSprite(): AnimatedSprite {
    // 임시 텍스처 생성
    const sprite = new AnimatedSprite([Texture.WHITE]);
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
      const standTextures = spriteManager.getActionTextures(this.spriteSet, 'stand');
      if (standTextures && standTextures.length > 0) {
        this.playAnimation('stand');
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
    
    this.currentAction = action;
    this.playAnimation(action);
  }

  private playAnimation(action: SpriteAction): void {
    if (!this.spriteSet) return;

    const textures = spriteManager.getActionTextures(this.spriteSet, action);
    if (textures && textures.length > 0) {
      // 텍스처 교체
      this.sprite.textures = textures;
      
      // 애니메이션 속도 설정
      if (action === 'walk') {
        this.sprite.animationSpeed = 0.15;
        this.sprite.play();
      } else if (action === 'run') {
        this.sprite.animationSpeed = 0.25;
        this.sprite.play();
      } else {
        // stand
        this.sprite.animationSpeed = 0.05;
        this.sprite.play();
      }
      
      // 틴트 제거 (기본 스프라이트가 틴트되어 있었을 수 있음)
      this.sprite.tint = 0xffffff;
      
      // 크기 조정 (첫 번째 프레임 기준)
      // this.sprite.width = textures[0].width;
      // this.sprite.height = textures[0].height;
      
      console.log(`[Avatar ${this.id}] Playing animation: ${action}`);
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
