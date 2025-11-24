import { Assets, Texture, Rectangle } from 'pixi.js';

export type SpriteAction = 'stand' | 'walk' | 'run';

export interface SpriteSet {
  stand?: Texture[];
  walk?: Texture[];
  run?: Texture[];
}

// 기본 스프라이트 경로
const DEFAULT_SPRITE_BASE_URL = '/assets/avatars/default';

// 액션 이름 매핑 (서버 → 로컬 파일명)
const ACTION_FILE_MAPPING: Record<SpriteAction, string> = {
  'stand': 'Idle',
  'walk': 'Walk',
  'run': 'Walk', // run은 Walk를 재사용
};

class SpriteManager {
  private static instance: SpriteManager;
  private spriteCache: Map<string, SpriteSet> = new Map();
  private loadingPromises: Map<string, Promise<SpriteSet>> = new Map();

  static getInstance(): SpriteManager {
    if (!SpriteManager.instance) {
      SpriteManager.instance = new SpriteManager();
    }
    return SpriteManager.instance;
  }

  /**
   * 아바타 스프라이트 세트를 로드합니다.
   * URL 형식: www.domain.com/{avatar_id} 또는 /assets/avatars/default
   *
   * @param baseUrl - 아바타 베이스 URL (예: www.domain.com/avatar123)
   * @returns SpriteSet containing stand, walk, run textures
   */
  async loadSpriteSet(baseUrl: string): Promise<SpriteSet> {
    // 캐시된 스프라이트 반환
    if (this.spriteCache.has(baseUrl)) {
      return this.spriteCache.get(baseUrl)!;
    }

    // 이미 로딩 중인 경우 Promise 공유
    if (this.loadingPromises.has(baseUrl)) {
      return this.loadingPromises.get(baseUrl)!;
    }

    const loadPromise = this.loadAllActions(baseUrl);
    this.loadingPromises.set(baseUrl, loadPromise);

    try {
      const spriteSet = await loadPromise;
      this.spriteCache.set(baseUrl, spriteSet);
      return spriteSet;
    } finally {
      this.loadingPromises.delete(baseUrl);
    }
  }

  /**
   * 단일 텍스처를 로드합니다 (GameObject용)
   */
  async loadTexture(url: string): Promise<Texture | null> {
    try {
      const normalizedUrl = this.normalizeUrl(url);
      const texture = await Assets.load(normalizedUrl);
      return texture;
    } catch (error) {
      console.warn(`[SpriteManager] Failed to load texture: ${url}`);
      return null;
    }
  }

  private async loadAllActions(baseUrl: string): Promise<SpriteSet> {
    const actions: SpriteAction[] = ['stand', 'walk', 'run'];
    const spriteSet: SpriteSet = {};
    const isDefaultSprite = baseUrl.includes('assets/avatars/default');

    // 모든 액션 스프라이트를 병렬로 로드
    const loadPromises = actions.map(async (action) => {
      const url = this.buildSpriteUrl(baseUrl, action);

      try {
        const texture = await Assets.load(url);
        const frames = this.extractFrames(texture);

        spriteSet[action] = frames;
        console.log(`[SpriteManager] Loaded ${action}: ${url} (${frames.length} frames)`);
      } catch (error) {
        console.warn(`[SpriteManager] Failed to load ${action}: ${url}`);

        // 서버 스프라이트 실패 시 기본 스프라이트로 폴백
        if (!isDefaultSprite) {
          try {
            const fallbackUrl = this.buildSpriteUrl(DEFAULT_SPRITE_BASE_URL, action);
            const fallbackTexture = await Assets.load(fallbackUrl);
            const frames = this.extractFrames(fallbackTexture);

            spriteSet[action] = frames;
            console.log(`[SpriteManager] Using default sprite for ${action} (${frames.length} frames)`);
          } catch (fallbackError) {
            console.error(`[SpriteManager] Failed to load default sprite for ${action}`);
          }
        }
      }
    });

    await Promise.all(loadPromises);

    // 최소 하나의 액션이라도 로드되었는지 확인
    if (!spriteSet.stand && !spriteSet.walk && !spriteSet.run) {
      throw new Error('Failed to load any sprite actions');
    }

    return spriteSet;
  }

  /**
   * 스프라이트 시트에서 프레임을 추출합니다.
   * 프레임 크기는 높이를 기준으로 동적으로 계산됩니다 (정사각형 프레임 가정).
   */
  private extractFrames(texture: Texture): Texture[] {
    const frameHeight = texture.height;
    const frameWidth = frameHeight; // 128x128 정사각형 프레임
    const frameCount = Math.floor(texture.width / frameWidth);
    const frames: Texture[] = [];

    for (let i = 0; i < frameCount; i++) {
      const rect = new Rectangle(i * frameWidth, 0, frameWidth, frameHeight);
      const frame = new Texture({
        source: texture.source,
        frame: rect
      });
      frames.push(frame);
    }

    return frames;
  }

  private buildSpriteUrl(baseUrl: string, action: SpriteAction): string {
    const normalizedUrl = this.normalizeUrl(baseUrl);

    // 로컬 에셋인 경우 파일명 매핑 사용
    if (normalizedUrl.includes('assets/avatars/default')) {
      const fileName = ACTION_FILE_MAPPING[action];
      return `${normalizedUrl}/${fileName}.png`;
    }

    // 외부 URL인 경우 액션명 그대로 사용
    return `${normalizedUrl}/${action}`;
  }

  private normalizeUrl(url: string): string {
    // 끝 슬래시 제거
    let normalized = url.replace(/\/$/, '');

    // 프로토콜이 없으면 https:// 추가 (로컬 경로 제외)
    if (!normalized.startsWith('http') && !normalized.startsWith('/')) {
      normalized = `https://${normalized}`;
    }

    return normalized;
  }

  getActionTextures(spriteSet: SpriteSet, action: SpriteAction): Texture[] | null {
    return spriteSet[action] ?? null;
  }

  clearCache(): void {
    this.spriteCache.clear();
    this.loadingPromises.clear();
  }
}

export const spriteManager = SpriteManager.getInstance();
