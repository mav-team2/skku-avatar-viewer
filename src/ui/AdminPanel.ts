export interface AdminPanelCallbacks {
  onCreateAvatar: (id: string, x: number, y: number, spriteUrl?: string) => void;
  onMoveAvatar: (id: string, x: number, y: number) => void;
  onCreateObject: (id: string, x: number, y: number, type: string, spriteUrl?: string) => void;
  onPickupObject: (avatarId: string, objectId: string) => void;
}

export class AdminPanel {
  private container: HTMLDivElement;
  private isVisible: boolean = false;
  private callbacks: AdminPanelCallbacks;

  constructor(callbacks: AdminPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = this.createPanel();
    document.body.appendChild(this.container);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'admin-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #00ff00;
      border-radius: 10px;
      padding: 20px;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      z-index: 10000;
      display: none;
      min-width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    `;

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; text-shadow: 0 0 10px #00ff00;">🎮 Admin Panel</h2>
        <button id="close-admin-panel" style="
          background: transparent;
          border: 1px solid #00ff00;
          color: #00ff00;
          padding: 5px 10px;
          cursor: pointer;
          border-radius: 5px;
          font-family: 'Courier New', monospace;
        ">✕ Close</button>
      </div>

      <div style="margin-bottom: 15px;">
        <div style="background: rgba(0, 255, 0, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 10px;">
          <strong>🎯 Easter Egg Activated!</strong><br/>
          <small>z + 3 clicks to toggle</small>
        </div>
      </div>

      <!-- Avatar Creation -->
      <div style="margin-bottom: 20px; border: 1px solid #00ff00; padding: 15px; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">👤 Create Avatar</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px;">
          <input type="text" id="avatar-id" placeholder="Avatar ID" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            flex: 1;
            min-width: 100px;
          " />
          <input type="number" id="avatar-x" placeholder="X" value="400" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            width: 80px;
          " />
          <input type="number" id="avatar-y" placeholder="Y" value="300" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            width: 80px;
          " />
          <button id="create-avatar-btn" style="
            background: #00ff00;
            border: none;
            color: black;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
          ">Create</button>
        </div>
        <input type="text" id="avatar-sprite-url" placeholder="Sprite URL (optional, e.g., www.domain.com/avatar_id)" style="
          background: rgba(0, 255, 0, 0.05);
          border: 1px solid rgba(0, 255, 0, 0.3);
          color: #00ff00;
          padding: 8px;
          border-radius: 5px;
          font-family: 'Courier New', monospace;
          width: 100%;
          font-size: 12px;
        " />
      </div>

      <!-- Avatar Movement -->
      <div style="margin-bottom: 20px; border: 1px solid #00ff00; padding: 15px; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">🏃 Move Avatar</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <input type="text" id="move-avatar-id" placeholder="Avatar ID" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            flex: 1;
            min-width: 100px;
          " />
          <input type="number" id="move-x" placeholder="X" value="600" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            width: 80px;
          " />
          <input type="number" id="move-y" placeholder="Y" value="400" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            width: 80px;
          " />
          <button id="move-avatar-btn" style="
            background: #00ff00;
            border: none;
            color: black;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
          ">Move</button>
        </div>
      </div>

      <!-- Object Creation -->
      <div style="margin-bottom: 20px; border: 1px solid #00ff00; padding: 15px; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">📦 Create Object</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px;">
          <input type="text" id="object-id" placeholder="Object ID" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            flex: 1;
            min-width: 80px;
          " />
          <input type="text" id="object-type" placeholder="Type" value="item" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            width: 80px;
          " />
          <input type="number" id="object-x" placeholder="X" value="200" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            width: 70px;
          " />
          <input type="number" id="object-y" placeholder="Y" value="200" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            width: 70px;
          " />
          <button id="create-object-btn" style="
            background: #00ff00;
            border: none;
            color: black;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
          ">Create</button>
        </div>
        <input type="text" id="object-sprite-url" placeholder="Sprite URL (optional)" style="
          background: rgba(0, 255, 0, 0.05);
          border: 1px solid rgba(0, 255, 0, 0.3);
          color: #00ff00;
          padding: 8px;
          border-radius: 5px;
          font-family: 'Courier New', monospace;
          width: 100%;
          font-size: 12px;
        " />
      </div>

      <!-- Object Pickup -->
      <div style="margin-bottom: 20px; border: 1px solid #00ff00; padding: 15px; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">✋ Pickup Object</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <input type="text" id="pickup-avatar-id" placeholder="Avatar ID" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            flex: 1;
            min-width: 100px;
          " />
          <input type="text" id="pickup-object-id" placeholder="Object ID" style="
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            flex: 1;
            min-width: 100px;
          " />
          <button id="pickup-object-btn" style="
            background: #00ff00;
            border: none;
            color: black;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-weight: bold;
          ">Pickup</button>
        </div>
      </div>

      <!-- Quick Actions -->
      <div style="border: 1px solid #00ff00; padding: 15px; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">⚡ Quick Actions</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="random-avatar-btn" style="
            background: transparent;
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            flex: 1;
          ">Random Avatar</button>
          <button id="random-object-btn" style="
            background: transparent;
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 8px 15px;
            cursor: pointer;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            flex: 1;
          ">Random Object</button>
        </div>
      </div>

      <div style="margin-top: 15px; text-align: center; font-size: 12px; color: rgba(0, 255, 0, 0.6);">
        Press ESC or click Close to hide
      </div>
    `;

    this.setupEventListeners(panel);
    return panel;
  }

  private setupEventListeners(panel: HTMLDivElement): void {
    // Close button
    const closeBtn = panel.querySelector('#close-admin-panel') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.hide());

    // Create Avatar
    const createAvatarBtn = panel.querySelector('#create-avatar-btn') as HTMLButtonElement;
    createAvatarBtn.addEventListener('click', () => {
      const id = (panel.querySelector('#avatar-id') as HTMLInputElement).value;
      const x = parseFloat((panel.querySelector('#avatar-x') as HTMLInputElement).value);
      const y = parseFloat((panel.querySelector('#avatar-y') as HTMLInputElement).value);
      const spriteUrl = (panel.querySelector('#avatar-sprite-url') as HTMLInputElement).value.trim();

      if (id) {
        this.callbacks.onCreateAvatar(id, x, y, spriteUrl || undefined);
        this.showNotification(`Avatar "${id}" created at (${x}, ${y})`);
      }
    });

    // Move Avatar
    const moveAvatarBtn = panel.querySelector('#move-avatar-btn') as HTMLButtonElement;
    moveAvatarBtn.addEventListener('click', () => {
      const id = (panel.querySelector('#move-avatar-id') as HTMLInputElement).value;
      const x = parseFloat((panel.querySelector('#move-x') as HTMLInputElement).value);
      const y = parseFloat((panel.querySelector('#move-y') as HTMLInputElement).value);

      if (id) {
        this.callbacks.onMoveAvatar(id, x, y);
        this.showNotification(`Avatar "${id}" moving to (${x}, ${y})`);
      }
    });

    // Create Object
    const createObjectBtn = panel.querySelector('#create-object-btn') as HTMLButtonElement;
    createObjectBtn.addEventListener('click', () => {
      const id = (panel.querySelector('#object-id') as HTMLInputElement).value;
      const type = (panel.querySelector('#object-type') as HTMLInputElement).value;
      const x = parseFloat((panel.querySelector('#object-x') as HTMLInputElement).value);
      const y = parseFloat((panel.querySelector('#object-y') as HTMLInputElement).value);
      const spriteUrl = (panel.querySelector('#object-sprite-url') as HTMLInputElement).value.trim();

      if (id) {
        this.callbacks.onCreateObject(id, x, y, type, spriteUrl || undefined);
        this.showNotification(`Object "${id}" created at (${x}, ${y})`);
      }
    });

    // Pickup Object
    const pickupObjectBtn = panel.querySelector('#pickup-object-btn') as HTMLButtonElement;
    pickupObjectBtn.addEventListener('click', () => {
      const avatarId = (panel.querySelector('#pickup-avatar-id') as HTMLInputElement).value;
      const objectId = (panel.querySelector('#pickup-object-id') as HTMLInputElement).value;

      if (avatarId && objectId) {
        this.callbacks.onPickupObject(avatarId, objectId);
        this.showNotification(`Avatar "${avatarId}" picked up "${objectId}"`);
      }
    });

    // Random Avatar
    const randomAvatarBtn = panel.querySelector('#random-avatar-btn') as HTMLButtonElement;
    randomAvatarBtn.addEventListener('click', () => {
      const id = `avatar-${Date.now()}`;
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      this.callbacks.onCreateAvatar(id, x, y, undefined);
      this.showNotification(`Random avatar "${id}" created`);
    });

    // Random Object
    const randomObjectBtn = panel.querySelector('#random-object-btn') as HTMLButtonElement;
    randomObjectBtn.addEventListener('click', () => {
      const id = `object-${Date.now()}`;
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      const types = ['coin', 'gem', 'item', 'powerup'];
      const type = types[Math.floor(Math.random() * types.length)];
      this.callbacks.onCreateObject(id, x, y, type, undefined);
      this.showNotification(`Random object "${id}" created`);
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 255, 0, 0.9);
      color: black;
      padding: 15px 20px;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      z-index: 10001;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transition = 'opacity 0.3s';
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  }

  show(): void {
    this.isVisible = true;
    this.container.style.display = 'block';
  }

  hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  destroy(): void {
    if (this.container.parentElement) {
      document.body.removeChild(this.container);
    }
  }
}
