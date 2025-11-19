/**
 * Easter egg handler that listens for specific key/click combinations
 * to reveal hidden features like the admin panel.
 *
 * Pattern: Press 'Z' key and click 3 times within 2 seconds
 */
export class EasterEggHandler {
  private clickCount = 0;
  private isKeyPressed = false;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private callbacks: Map<string, () => void> = new Map();

  private readonly triggerKey = 'z';
  private readonly requiredClicks = 3;
  private readonly timeWindow = 2000; // milliseconds

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    // Key down listener
    document.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === this.triggerKey) {
        this.isKeyPressed = true;
      }
    });

    // Key up listener
    document.addEventListener('keyup', (event) => {
      if (event.key.toLowerCase() === this.triggerKey) {
        this.isKeyPressed = false;
        this.resetClickCount();
      }
    });

    // Click listener
    document.addEventListener('click', () => {
      if (this.isKeyPressed) {
        this.handleClick();
      }
    });
  }

  private handleClick(): void {
    this.clickCount++;

    // Reset timeout on each click
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Set new timeout
    this.timeout = setTimeout(() => {
      this.resetClickCount();
    }, this.timeWindow);

    // Check if trigger condition is met
    if (this.clickCount >= this.requiredClicks) {
      this.trigger();
      this.resetClickCount();
    }
  }

  private resetClickCount(): void {
    this.clickCount = 0;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  private trigger(): void {
    console.log('[EasterEgg] Triggered!');
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[EasterEgg] Callback error:', error);
      }
    });
  }

  /**
   * Register a callback to be called when the easter egg is triggered
   */
  onTrigger(id: string, callback: () => void): void {
    this.callbacks.set(id, callback);
  }

  /**
   * Remove a registered callback
   */
  offTrigger(id: string): void {
    this.callbacks.delete(id);
  }

  /**
   * Manually trigger the easter egg (for testing)
   */
  manualTrigger(): void {
    this.trigger();
  }
}

export const easterEggHandler = new EasterEggHandler();
