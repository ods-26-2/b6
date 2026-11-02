/**
 * @ods/b6-app-shell
 * Módulo B6.4 - Casca da Aplicação (App Shell)
 * Descrição: Componente de layout base, navegação, tema e status da placa Jetson.
 * Diretrizes: Zero regras de negócio, injeção de dependências e delegação via callbacks.
 */

export type ThemeMode = 'DARK' | 'LIGHT';

export interface JetsonStatus {
  cpuLoad: number; // 0-100%
  gpuLoad: number; // 0-100%
  ramUsage: number; // 0-100%
  temperature: number; // Graus Celsius
  isOnline: boolean;
}

export interface AppShellOptions {
  containerId: string;
  appName: string;
  initialTheme?: ThemeMode;
  onThemeToggle?: (newTheme: ThemeMode) => void;
  onNavClick?: (routeId: string) => void;
}

export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  isActive?: boolean;
}

export class AppShell {
  private container: HTMLElement;
  private wrapper!: HTMLDivElement;
  private header!: HTMLDivElement;
  private sidebar!: HTMLDivElement;
  private mainContent!: HTMLDivElement;
  private statusPanel!: HTMLDivElement;

  private options: AppShellOptions;
  private currentTheme: ThemeMode;
  private navItems: NavItem[] = [];

  constructor(options: AppShellOptions) {
    const el = document.getElementById(options.containerId);
    if (!el) throw new Error(`Contentor '${options.containerId}' não localizado.`);
    
    this.container = el;
    this.options = options;
    this.currentTheme = options.initialTheme || 'DARK';

    this.injectDesignSystemTokens();
    this.buildDOM();
    this.applyTheme();
  }

  // --- API PÚBLICA ---

  public setNavItems(items: NavItem[]): void {
    this.navItems = items;
    this.renderSidebar();
  }

  public updateJetsonStatus(status: JetsonStatus): void {
    this.renderStatusPanel(status);
  }

  public getMainContainer(): HTMLDivElement {
    return this.mainContent;
  }

  public toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'DARK' ? 'LIGHT' : 'DARK';
    this.applyTheme();
    this.options.onThemeToggle?.(this.currentTheme);
  }

  // --- CONSTRUÇÃO VISUAL ---

  private injectDesignSystemTokens(): void {
    if (document.getElementById('ods-design-system-tokens')) return;

    const style = document.createElement('style');
    style.id = 'ods-design-system-tokens';
    style.textContent = `
      :root {
        --ods-color-primary: #2196F3;
        --ods-color-success: #4CAF50;
        --ods-color-warning: #ff9800;
        --ods-color-danger: #f44336;
        --ods-font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .ods-theme-dark {
        --ods-bg-base: #121212;
        --ods-bg-surface: #1e1e1e;
        --ods-bg-elevated: #2a2a2a;
        --ods-text-primary: #ffffff;
        --ods-text-secondary: #aaaaaa;
        --ods-border-color: #333333;
      }

      .ods-theme-light {
        --ods-bg-base: #f5f5f5;
        --ods-bg-surface: #ffffff;
        --ods-bg-elevated: #e0e0e0;
        --ods-text-primary: #212121;
        --ods-text-secondary: #757575;
        --ods-border-color: #cccccc;
      }

      .ods-app-shell {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100vw;
        background-color: var(--ods-bg-base);
        color: var(--ods-text-primary);
        font-family: var(--ods-font-family);
        overflow: hidden;
      }

      .ods-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 60px;
        background-color: var(--ods-bg-surface);
        border-bottom: 1px solid var(--ods-border-color);
        padding: 0 20px;
      }

      .ods-header-title { font-size: 20px; font-weight: bold; }
      
      .ods-body {
        display: flex;
        flex-grow: 1;
        overflow: hidden;
      }

      .ods-sidebar {
        width: 250px;
        background-color: var(--ods-bg-surface);
        border-right: 1px solid var(--ods-border-color);
        display: flex;
        flex-direction: column;
      }

      .ods-nav-list {
        flex-grow: 1;
        padding: 10px 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .ods-nav-item {
        padding: 12px 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--ods-text-secondary);
        transition: background 0.2s, color 0.2s;
      }

      .ods-nav-item:hover { background-color: var(--ods-bg-elevated); color: var(--ods-text-primary); }
      .ods-nav-item.active { background-color: var(--ods-bg-elevated); color: var(--ods-color-primary); border-left: 4px solid var(--ods-color-primary); }

      .ods-status-panel {
        padding: 15px;
        border-top: 1px solid var(--ods-border-color);
        font-size: 12px;
        color: var(--ods-text-secondary);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .ods-status-row { display: flex; justify-content: space-between; }
      
      .ods-status-indicator {
        display: inline-block; width: 8px; height: 8px; border-radius: 50%;
      }
      .ods-status-online { background-color: var(--ods-color-success); }
      .ods-status-offline { background-color: var(--ods-color-danger); }

      .ods-main-content {
        flex-grow: 1;
        padding: 20px;
        overflow-y: auto;
        background-color: var(--ods-bg-base);
      }
      
      .ods-theme-btn {
        background: var(--ods-bg-elevated);
        border: 1px solid var(--ods-border-color);
        color: var(--ods-text-primary);
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  private buildDOM(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'ods-app-shell';

    // Header
    this.header = document.createElement('div');
    this.header.className = 'ods-header';
    this.header.innerHTML = `
      <div class="ods-header-title">${this.options.appName}</div>
      <button class="ods-theme-btn" id="ods-theme-toggle">🌓 Tema</button>
    `;

    // Body
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'ods-body';

    // Sidebar
    this.sidebar = document.createElement('div');
    this.sidebar.className = 'ods-sidebar';
    
    const navList = document.createElement('div');
    navList.className = 'ods-nav-list';
    this.sidebar.appendChild(navList);

    this.statusPanel = document.createElement('div');
    this.statusPanel.className = 'ods-status-panel';
    this.sidebar.appendChild(this.statusPanel);

    // Main Content
    this.mainContent = document.createElement('div');
    this.mainContent.className = 'ods-main-content';

    bodyContainer.appendChild(this.sidebar);
    bodyContainer.appendChild(this.mainContent);

    this.wrapper.appendChild(this.header);
    this.wrapper.appendChild(bodyContainer);

    this.container.appendChild(this.wrapper);

    // Eventos Internos
    this.header.querySelector('#ods-theme-toggle')?.addEventListener('click', () => this.toggleTheme());
    
    // Status inicial
    this.renderStatusPanel({ cpuLoad: 0, gpuLoad: 0, ramUsage: 0, temperature: 0, isOnline: false });
  }

  private applyTheme(): void {
    this.wrapper.classList.remove('ods-theme-dark', 'ods-theme-light');
    this.wrapper.classList.add(`ods-theme-${this.currentTheme.toLowerCase()}`);
  }

  private renderSidebar(): void {
    const navList = this.sidebar.querySelector('.ods-nav-list');
    if (!navList) return;
    
    navList.innerHTML = '';

    this.navItems.forEach(item => {
      const el = document.createElement('div');
      el.className = `ods-nav-item ${item.isActive ? 'active' : ''}`;
      el.innerHTML = `${item.icon || '📄'} <span>${item.label}</span>`;
      
      el.addEventListener('click', () => {
        // Atualiza UI ativa
        this.navItems.forEach(i => i.isActive = false);
        item.isActive = true;
        this.renderSidebar();
        
        // Delega rota
        this.options.onNavClick?.(item.id);
      });

      navList.appendChild(el);
    });
  }

  private renderStatusPanel(status: JetsonStatus): void {
    const indicatorClass = status.isOnline ? 'ods-status-online' : 'ods-status-offline';
    const statusText = status.isOnline ? 'Placa Conectada' : 'Placa Offline';

    this.statusPanel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px; color: var(--ods-text-primary);">
        <span class="ods-status-indicator ${indicatorClass}"></span> Jetson Orin Nano
      </div>
      <div class="ods-status-row"><span>CPU:</span> <span>${status.cpuLoad}%</span></div>
      <div class="ods-status-row"><span>GPU:</span> <span>${status.gpuLoad}%</span></div>
      <div class="ods-status-row"><span>RAM:</span> <span>${status.ramUsage}%</span></div>
      <div class="ods-status-row"><span>Temp:</span> <span>${status.temperature}°C</span></div>
    `;
  }
}