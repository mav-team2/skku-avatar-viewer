import type { GameApplication } from '../core/GameApplication';

/**
 * Admin panel for testing game functionality
 * Toggle with Z + 3 clicks easter egg
 */
export class AdminPanel {
  private panel: HTMLDivElement;
  private isVisible = false;
  private avatarCount = 0;
  private objectCount = 0;
  private game: GameApplication;

  constructor(game: GameApplication) {
    this.game = game;
    this.panel = this.createPanel();
    document.body.appendChild(this.panel);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'admin-panel';
    panel.innerHTML = `
      <style>
        #admin-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 320px;
          background: rgba(26, 26, 46, 0.95);
          border: 2px solid #4ecdc4;
          border-radius: 8px;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          color: #ffffff;
          z-index: 10000;
          display: none;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        #admin-panel.visible {
          display: block;
        }

        #admin-panel h3 {
          margin: 0 0 16px 0;
          color: #4ecdc4;
          font-size: 16px;
          border-bottom: 1px solid #4ecdc4;
          padding-bottom: 8px;
        }

        #admin-panel .section {
          margin-bottom: 16px;
        }

        #admin-panel .section-title {
          font-weight: bold;
          margin-bottom: 8px;
          color: #ff6b6b;
        }

        #admin-panel label {
          display: block;
          margin-bottom: 4px;
          color: #cccccc;
        }

        #admin-panel input {
          width: 100%;
          padding: 8px;
          margin-bottom: 8px;
          border: 1px solid #333;
          border-radius: 4px;
          background: #2a2a4e;
          color: #ffffff;
          box-sizing: border-box;
        }

        #admin-panel input:focus {
          outline: none;
          border-color: #4ecdc4;
        }

        #admin-panel button {
          width: 100%;
          padding: 10px;
          margin-bottom: 8px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          transition: background-color 0.2s;
        }

        #admin-panel .btn-primary {
          background: #4ecdc4;
          color: #1a1a2e;
        }

        #admin-panel .btn-primary:hover {
          background: #3dbdb5;
        }

        #admin-panel .btn-secondary {
          background: #ff6b6b;
          color: #ffffff;
        }

        #admin-panel .btn-secondary:hover {
          background: #ff5252;
        }

        #admin-panel .btn-warning {
          background: #f9ca24;
          color: #1a1a2e;
        }

        #admin-panel .btn-warning:hover {
          background: #f0b90b;
        }

        #admin-panel .close-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          color: #ffffff;
          font-size: 20px;
          cursor: pointer;
          width: auto;
          padding: 4px 8px;
          margin: 0;
        }

        #admin-panel .close-btn:hover {
          color: #ff6b6b;
        }
      </style>

      <button class="close-btn" id="close-admin-panel">&times;</button>
      <h3>🎮 Admin Panel</h3>

      <div class="section">
        <div class="section-title">Create Avatar</div>
        <label>Position X</label>
        <input type="number" id="avatar-x" value="400" />
        <label>Position Y</label>
        <input type="number" id="avatar-y" value="300" />
        <label>Sprite URL (optional)</label>
        <input type="text" id="avatar-sprite" placeholder="www.domain.com/avatar_id" />
        <button class="btn-primary" id="create-avatar">Create Avatar</button>
      </div>

      <div class="section">
        <div class="section-title">Move Avatar</div>
        <label>Avatar ID</label>
        <input type="text" id="move-avatar-id" placeholder="avatar_0" />
        <label>Target X</label>
        <input type="number" id="move-x" value="600" />
        <label>Target Y</label>
        <input type="number" id="move-y" value="400" />
        <button class="btn-warning" id="move-avatar">Move Avatar</button>
      </div>

      <div class="section">
        <div class="section-title">Create Object</div>
        <label>Position X</label>
        <input type="number" id="object-x" value="500" />
        <label>Position Y</label>
        <input type="number" id="object-y" value="350" />
        <label>Sprite URL (optional)</label>
        <input type="text" id="object-sprite" placeholder="www.domain.com/object.png" />
        <button class="btn-primary" id="create-object">Create Object</button>
      </div>

      <div class="section">
        <div class="section-title">Pickup Object</div>
        <label>Object ID</label>
        <input type="text" id="pickup-object-id" placeholder="object_0" />
        <button class="btn-secondary" id="pickup-object">Pickup Object</button>
      </div>
    `;

    return panel;
  }

  private setupEventListeners(): void {
    // Close button
    document.getElementById('close-admin-panel')?.addEventListener('click', () => {
      this.hide();
    });

    // Create Avatar
    document.getElementById('create-avatar')?.addEventListener('click', () => {
      const x = parseInt((document.getElementById('avatar-x') as HTMLInputElement).value) || 400;
      const y = parseInt((document.getElementById('avatar-y') as HTMLInputElement).value) || 300;
      const spriteUrl = (document.getElementById('avatar-sprite') as HTMLInputElement).value || undefined;

      const id = `avatar_${this.avatarCount++}`;
      this.game.testCreateAvatar(id, x, y, spriteUrl);

      // Update move avatar ID field
      (document.getElementById('move-avatar-id') as HTMLInputElement).value = id;
    });

    // Move Avatar
    document.getElementById('move-avatar')?.addEventListener('click', () => {
      const id = (document.getElementById('move-avatar-id') as HTMLInputElement).value;
      const x = parseInt((document.getElementById('move-x') as HTMLInputElement).value) || 600;
      const y = parseInt((document.getElementById('move-y') as HTMLInputElement).value) || 400;

      if (id) {
        this.game.testMoveAvatar(id, x, y);
      }
    });

    // Create Object
    document.getElementById('create-object')?.addEventListener('click', () => {
      const x = parseInt((document.getElementById('object-x') as HTMLInputElement).value) || 500;
      const y = parseInt((document.getElementById('object-y') as HTMLInputElement).value) || 350;
      const spriteUrl = (document.getElementById('object-sprite') as HTMLInputElement).value || undefined;

      const id = `object_${this.objectCount++}`;
      this.game.testCreateObject(id, x, y, spriteUrl);

      // Update pickup object ID field
      (document.getElementById('pickup-object-id') as HTMLInputElement).value = id;
    });

    // Pickup Object
    document.getElementById('pickup-object')?.addEventListener('click', () => {
      const objectId = (document.getElementById('pickup-object-id') as HTMLInputElement).value;

      if (objectId) {
        this.game.pickupObject(objectId, 'admin');
      }
    });
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    this.panel.classList.add('visible');
    this.isVisible = true;
    this.setupEventListeners();
    console.log('[AdminPanel] Shown');
  }

  hide(): void {
    this.panel.classList.remove('visible');
    this.isVisible = false;
    console.log('[AdminPanel] Hidden');
  }

  destroy(): void {
    this.panel.remove();
  }
}
