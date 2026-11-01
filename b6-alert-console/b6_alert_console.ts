/**
 * @ods/b6-alert-console
 * Módulo B6.3 - Console de Alertas (Painel de Eventos)
 * Descrição: Componente visual encapsulado para listar, reconhecer, silenciar e encerrar alertas.
 * Inclui: Filtros Rápidos, Ações em Massa e Integração de Foco no Vídeo.
 * Diretrizes: Zero regras de negócio de domínio (apenas UI). Eventos delegados via callbacks.
 */

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'MUTED' | 'CLOSED';
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertFilter = 'ALL' | 'ACTIVE' | 'CRITICAL';

export interface AlertPayload {
  id: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  status: AlertStatus;
}

export interface AlertConsoleOptions {
  containerId: string;
  onAcknowledge?: (alertId: string) => void;
  onMute?: (alertId: string) => void;
  onClose?: (alertId: string) => void;
  onFocusTimeline?: (alertId: string, timestamp: number) => void; // Opção 2
  onAcknowledgeAll?: () => void; // Opção 4
}

export class AlertConsole {
  private container: HTMLElement;
  private wrapper!: HTMLDivElement;
  private header!: HTMLDivElement;
  private toolbar!: HTMLDivElement;
  private listContainer!: HTMLDivElement;
  
  private options: AlertConsoleOptions;
  private alerts: Map<string, AlertPayload> = new Map();
  private currentFilter: AlertFilter = 'ALL'; // Opção 3

  constructor(options: AlertConsoleOptions) {
    const el = document.getElementById(options.containerId);
    if (!el) throw new Error(`Contentor '${options.containerId}' não localizado.`);
    this.container = el;
    this.options = options;

    this.injectStyles();
    this.buildDOM();
    this.bindToolbarEvents();
  }

  // --- API PÚBLICA (Alimentada pelo Backend) ---

  public loadAlerts(alerts: AlertPayload[]): void {
    this.alerts.clear();
    alerts.forEach(a => this.alerts.set(a.id, a));
    this.render();
  }

  public addAlert(alert: AlertPayload): void {
    this.alerts.set(alert.id, alert);
    this.render();
  }

  public removeAlert(alertId: string): void {
    if (this.alerts.has(alertId)) {
      this.alerts.delete(alertId);
      this.render();
    }
  }

  public updateAlertStatus(alertId: string, status: AlertStatus): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = status;
      this.render();
    }
  }

  public acknowledgeAllActiveLocally(): void {
    // Utilitário para o Frontend atualizar a interface imediatamente após sucesso do Backend
    this.alerts.forEach(alert => {
      if (alert.status === 'ACTIVE') {
        alert.status = 'ACKNOWLEDGED';
      }
    });
    this.render();
  }

  // --- CONSTRUÇÃO VISUAL ---

  private injectStyles(): void {
    if (document.getElementById('ods-alert-console-styles')) return;

    const style = document.createElement('style');
    style.id = 'ods-alert-console-styles';
    style.textContent = `
      .ods-alert-console { width: 100%; max-width: 600px; background: #1e1e1e; border: 1px solid #333; border-radius: 8px; display: flex; flex-direction: column; font-family: sans-serif; color: #fff; max-height: 600px; }
      .ods-alert-header { padding: 15px; background: #2a2a2a; border-bottom: 1px solid #444; font-weight: bold; font-size: 16px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0; }
      
      .ods-alert-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; background: #222; border-bottom: 1px solid #444; }
      .ods-alert-filters { display: flex; gap: 5px; }
      .ods-filter-btn { background: transparent; border: 1px solid #555; color: #aaa; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; transition: all 0.2s; }
      .ods-filter-btn:hover { background: #333; color: #fff; }
      .ods-filter-btn.active { background: #2196F3; border-color: #2196F3; color: white; font-weight: bold; }
      
      .ods-alert-list { flex-grow: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
      .ods-alert-card { background: #252525; border-left: 5px solid #555; border-radius: 4px; padding: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: opacity 0.2s; }
      .ods-alert-card.severity-CRITICAL { border-color: #f44336; }
      .ods-alert-card.severity-WARNING { border-color: #ff9800; }
      .ods-alert-card.severity-INFO { border-color: #2196F3; }
      .ods-alert-card.status-MUTED { opacity: 0.6; }
      
      .ods-alert-meta { display: flex; justify-content: space-between; font-size: 12px; color: #aaa; }
      .ods-alert-msg { font-size: 14px; margin: 5px 0; }
      
      .ods-alert-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 5px; flex-wrap: wrap; }
      .ods-btn { background: #333; border: 1px solid #444; color: white; padding: 5px 10px; font-size: 12px; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
      .ods-btn:hover { background: #444; }
      .ods-btn-focus { background: #0D47A1; border-color: #0D47A1; }
      .ods-btn-focus:hover { background: #1565C0; }
      .ods-btn-ack:hover { background: #2E7D32; border-color: #2E7D32; }
      .ods-btn-mute:hover { background: #555; }
      .ods-btn-close:hover { background: #D32F2F; border-color: #D32F2F; }
      .ods-btn-bulk { background: #2E7D32; border-color: #1B5E20; padding: 4px 10px; }
      .ods-btn-bulk:hover { background: #1B5E20; }
    `;
    document.head.appendChild(style);
  }

  private buildDOM(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'ods-alert-console';

    this.header = document.createElement('div');
    this.header.className = 'ods-alert-header';
    this.header.innerHTML = `<span>Console de Alertas</span><span id="ods-alert-count">0</span>`;

    this.toolbar = document.createElement('div');
    this.toolbar.className = 'ods-alert-toolbar';
    this.toolbar.innerHTML = `
      <div class="ods-alert-filters">
        <button class="ods-filter-btn active" data-filter="ALL">Todos</button>
        <button class="ods-filter-btn" data-filter="ACTIVE">Ativos</button>
        <button class="ods-filter-btn" data-filter="CRITICAL">Críticos</button>
      </div>
      <button class="ods-btn ods-btn-bulk" id="ods-bulk-ack-btn">✔️ Reconhecer Todos</button>
    `;

    this.listContainer = document.createElement('div');
    this.listContainer.className = 'ods-alert-list';

    this.wrapper.appendChild(this.header);
    this.wrapper.appendChild(this.toolbar);
    this.wrapper.appendChild(this.listContainer);
    this.container.appendChild(this.wrapper);
  }

  private bindToolbarEvents(): void {
    const filterBtns = this.toolbar.querySelectorAll('.ods-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        filterBtns.forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        this.currentFilter = target.dataset.filter as AlertFilter;
        this.render();
      });
    });

    const bulkBtn = this.toolbar.querySelector('#ods-bulk-ack-btn') as HTMLButtonElement;
    bulkBtn.addEventListener('click', () => {
      this.options.onAcknowledgeAll?.();
    });
  }

  private render(): void {
    this.listContainer.innerHTML = '';
    
    // Filtro Base: Excluir os encerrados
    let filteredAlerts = Array.from(this.alerts.values()).filter(a => a.status !== 'CLOSED');
    
    // Filtro por Tabs (Opção 3)
    if (this.currentFilter === 'ACTIVE') {
      filteredAlerts = filteredAlerts.filter(a => a.status === 'ACTIVE');
    } else if (this.currentFilter === 'CRITICAL') {
      filteredAlerts = filteredAlerts.filter(a => a.severity === 'CRITICAL');
    }

    filteredAlerts.sort((a, b) => b.timestamp - a.timestamp); // Mais recentes primeiro

    const countEl = this.header.querySelector('#ods-alert-count');
    if (countEl) countEl.textContent = `${filteredAlerts.length} Exibidos`;

    if (filteredAlerts.length === 0) {
      this.listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color:#777;">Nenhum alerta correspondente.</div>';
      return;
    }

    filteredAlerts.forEach(alert => {
      const card = document.createElement('div');
      card.className = `ods-alert-card severity-${alert.severity} status-${alert.status}`;
      
      const timeStr = new Date(alert.timestamp).toLocaleTimeString('pt-PT');
      const statusBadge = this.getStatusBadge(alert.status);

      card.innerHTML = `
        <div class="ods-alert-meta">
          <span><strong>[${alert.severity}]</strong> ${timeStr}</span>
          ${statusBadge}
        </div>
        <div class="ods-alert-msg">${alert.message}</div>
        <div class="ods-alert-actions"></div>
      `;

      const actionsContainer = card.querySelector('.ods-alert-actions') as HTMLElement;

      // Botão Focar na Linha do Tempo (Opção 2)
      if (this.options.onFocusTimeline) {
        const btnFocus = document.createElement('button');
        btnFocus.className = 'ods-btn ods-btn-focus';
        btnFocus.innerText = '⏱️ Ver no Vídeo';
        btnFocus.onclick = () => this.options.onFocusTimeline?.(alert.id, alert.timestamp);
        actionsContainer.appendChild(btnFocus);
      }

      // Botão Reconhecer
      if (alert.status === 'ACTIVE') {
        const btnAck = document.createElement('button');
        btnAck.className = 'ods-btn ods-btn-ack';
        btnAck.innerText = '✔️ Reconhecer';
        btnAck.onclick = () => this.options.onAcknowledge?.(alert.id);
        actionsContainer.appendChild(btnAck);
      }

      // Botão Silenciar
      if (alert.status !== 'MUTED') {
        const btnMute = document.createElement('button');
        btnMute.className = 'ods-btn ods-btn-mute';
        btnMute.innerText = '🔇 Silenciar';
        btnMute.onclick = () => this.options.onMute?.(alert.id);
        actionsContainer.appendChild(btnMute);
      }

      // Botão Encerrar
      const btnClose = document.createElement('button');
      btnClose.className = 'ods-btn ods-btn-close';
      btnClose.innerText = '✖️ Encerrar';
      btnClose.onclick = () => this.options.onClose?.(alert.id);
      actionsContainer.appendChild(btnClose);

      this.listContainer.appendChild(card);
    });
  }

  private getStatusBadge(status: AlertStatus): string {
    switch(status) {
      case 'ACTIVE': return '<span style="color: #f44336;">NOVO</span>';
      case 'ACKNOWLEDGED': return '<span style="color: #4CAF50;">RECONHECIDO</span>';
      case 'MUTED': return '<span style="color: #9e9e9e;">SILENCIADO</span>';
      default: return '';
    }
  }
}