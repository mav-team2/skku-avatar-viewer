export class EasterEggHandler {
  private zKeyPressed: boolean = false;
  private clickCount: number = 0;
  private clickTimeout: number | null = null;
  private readonly CLICK_TIMEOUT_MS = 2000; // 2 seconds to complete 3 clicks
  private readonly REQUIRED_CLICKS = 3;
  private onActivated: () => void;

  constructor(onActivated: () => void) {
    this.onActivated = onActivated;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Track Z key press
    document.addEventListener('keydown', (e) => {
      if (e.key === 'z' || e.key === 'Z') {
        this.zKeyPressed = true;
        console.log('🎮 Easter egg: Z key pressed');
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.key === 'z' || e.key === 'Z') {
        this.zKeyPressed = false;
        // Reset click count when Z is released
        this.resetClickCount();
      }
    });

    // Track clicks while Z is pressed
    document.addEventListener('click', () => {
      if (this.zKeyPressed) {
        this.handleClick();
      }
    });
  }

  private handleClick(): void {
    this.clickCount++;
    console.log(`🎮 Easter egg: Click ${this.clickCount}/${this.REQUIRED_CLICKS}`);

    // Clear existing timeout
    if (this.clickTimeout !== null) {
      clearTimeout(this.clickTimeout);
    }

    // Check if we've reached the required number of clicks
    if (this.clickCount >= this.REQUIRED_CLICKS) {
      this.activate();
      this.resetClickCount();
      return;
    }

    // Set timeout to reset clicks if not completed in time
    this.clickTimeout = window.setTimeout(() => {
      console.log('🎮 Easter egg: Click timeout, resetting');
      this.resetClickCount();
    }, this.CLICK_TIMEOUT_MS);
  }

  private activate(): void {
    console.log('🎮 Easter egg activated!');
    this.showActivationEffect();
    this.onActivated();
  }

  private showActivationEffect(): void {
    // Create visual feedback
    const effect = document.createElement('div');
    effect.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 255, 0, 0.9);
      color: black;
      padding: 30px 50px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      font-size: 24px;
      font-weight: bold;
      z-index: 9999;
      box-shadow: 0 0 50px rgba(0, 255, 0, 0.8);
      animation: pulse 0.5s ease-in-out;
    `;
    effect.textContent = '🎮 ADMIN MODE ACTIVATED 🎮';

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.1); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(effect);

    // Remove after animation
    setTimeout(() => {
      effect.style.transition = 'opacity 0.3s';
      effect.style.opacity = '0';
      setTimeout(() => {
        if (effect.parentElement) {
          document.body.removeChild(effect);
        }
      }, 300);
    }, 1000);
  }

  private resetClickCount(): void {
    this.clickCount = 0;
    if (this.clickTimeout !== null) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }
  }

  destroy(): void {
    this.resetClickCount();
  }
}
