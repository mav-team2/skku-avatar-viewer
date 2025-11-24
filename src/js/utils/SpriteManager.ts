import { Assets, Texture, Rectangle } from 'pixi.js';

export type SpriteAction = 'stand' | 'walk' | 'run';

export interface SpriteSet {
  stand?: Texture[];
  walk?: Texture[];
  run?: Texture[];
}

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
   * URL 형식: www.domain.com/{avatar_id}/{status}
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

    // 모든 액션 스프라이트를 병렬로 로드
    const loadPromises = actions.map(async (action) => {
      const url = this.buildSpriteUrl(baseUrl, action);
      try {
        const texture = await Assets.load(url);
        
        // 텍스처를 프레임으로 분할 (여기서는 간단히 가로 스트립 가정)
        // 실제로는 메타데이터나 규칙이 필요할 수 있음
        // 현재 규칙: 
        // - stand: 1프레임 (32x48)
        // - walk: 3프레임 (96x48 -> 32x48 * 3)
        
        const frameWidth = 32;
        const frameHeight = 48;
        const frames: Texture[] = [];
        
        const cols = Math.floor(texture.width / frameWidth);
        
        for (let i = 0; i < cols; i++) {
          const rect = new Rectangle(i * frameWidth, 0, frameWidth, frameHeight);
          const frame = new Texture({
            source: texture.source,
            frame: rect
          });
          frames.push(frame);
        }
        
        spriteSet[action] = frames;
        console.log(`[SpriteManager] Loaded ${action}: ${url} (${frames.length} frames)`);
      } catch (error) {
        // console.warn(`[SpriteManager] Failed to load ${action}: ${url}`);
        // 개별 액션 실패는 허용 (fallback 사용)
      }
    });

    await Promise.all(loadPromises);
    return spriteSet;
  }

  private buildSpriteUrl(baseUrl: string, action: SpriteAction): string {
    const normalizedUrl = this.normalizeUrl(baseUrl);
    // 로컬 에셋인 경우 확장자 .png 추가 (임시)
    if (normalizedUrl.includes('assets/avatars')) {
      return `${normalizedUrl}/${action}.png`;
    }
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
