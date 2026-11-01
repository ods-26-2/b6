/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AlertConsole, AlertPayload } from './b6_alert_console';

describe('B6.3 - Console de Alertas (Testes UI Avançados)', () => {
  let mockContainer: HTMLElement;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockContainer.id = 'test-alert-container';
    document.body.appendChild(mockContainer);
  });

  afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

  it('deve_aplicar_filtros_de_tabs_corretamente', () => {
    const consoleUI = new AlertConsole({ containerId: 'test-alert-container' });
    consoleUI.loadAlerts([
      { id: '1', severity: 'CRITICAL', message: 'Crit', timestamp: 1, status: 'ACTIVE' },
      { id: '2', severity: 'WARNING', message: 'Warn', timestamp: 2, status: 'ACTIVE' }
    ]);

    // Testar Tab Críticos (Opção 3)
    const critTab = mockContainer.querySelector('[data-filter="CRITICAL"]') as HTMLButtonElement;
    critTab.click();
    
    const cards = mockContainer.querySelectorAll('.ods-alert-card');
    expect(cards.length).toBe(1);
    expect(cards[0].innerHTML).toContain('Crit');
  });

  it('deve_disparar_evento_focus_timeline', () => {
    const onFocusMock = vi.fn();
    const consoleUI = new AlertConsole({ 
      containerId: 'test-alert-container',
      onFocusTimeline: onFocusMock 
    });

    consoleUI.addAlert({ id: '1', severity: 'INFO', message: 'Test', timestamp: 12345, status: 'ACTIVE' });

    // Testar botão "Ver no Vídeo" (Opção 2)
    const btnFocus = mockContainer.querySelector('.ods-btn-focus') as HTMLButtonElement;
    btnFocus.click();

    expect(onFocusMock).toHaveBeenCalledWith('1', 12345);
  });

  it('deve_disparar_acao_em_massa_reconhecer_todos', () => {
    const onBulkAckMock = vi.fn();
    const consoleUI = new AlertConsole({ 
      containerId: 'test-alert-container',
      onAcknowledgeAll: onBulkAckMock 
    });

    // Testar botão "Reconhecer Todos" (Opção 4)
    const btnBulk = mockContainer.querySelector('#ods-bulk-ack-btn') as HTMLButtonElement;
    btnBulk.click();

    expect(onBulkAckMock).toHaveBeenCalledTimes(1);
  });
});