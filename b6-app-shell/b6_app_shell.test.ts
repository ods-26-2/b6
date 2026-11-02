/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppShell } from './b6_app_shell';

describe('B6.4 - App Shell (Testes de Estrutura e Temas)', () => {
  let mockContainer: HTMLElement;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockContainer.id = 'test-shell-container';
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('deve_inicializar_a_shell_e_injetar_no_dom', () => {
    const shell = new AppShell({ containerId: 'test-shell-container', appName: 'Test App' });
    expect(mockContainer.querySelector('.ods-app-shell')).not.toBeNull();
    expect(mockContainer.querySelector('.ods-header-title')?.textContent).toBe('Test App');
  });

  it('deve_aplicar_o_tema_inicial_correto', () => {
    const shell = new AppShell({ containerId: 'test-shell-container', appName: 'Test App', initialTheme: 'LIGHT' });
    const wrapper = mockContainer.querySelector('.ods-app-shell');
    expect(wrapper?.classList.contains('ods-theme-light')).toBe(true);
  });

  it('deve_alternar_temas_e_disparar_callback', () => {
    const onThemeMock = vi.fn();
    const shell = new AppShell({ 
      containerId: 'test-shell-container', 
      appName: 'App', 
      initialTheme: 'DARK',
      onThemeToggle: onThemeMock
    });

    const wrapper = mockContainer.querySelector('.ods-app-shell');
    const toggleBtn = mockContainer.querySelector('#ods-theme-toggle') as HTMLButtonElement;
    
    // Clica no botão de tema
    toggleBtn.click();

    expect(wrapper?.classList.contains('ods-theme-light')).toBe(true);
    expect(onThemeMock).toHaveBeenCalledWith('LIGHT');
  });

  it('deve_exibir_metricas_da_jetson_corretamente', () => {
    const shell = new AppShell({ containerId: 'test-shell-container', appName: 'App' });
    
    shell.updateJetsonStatus({
      isOnline: true, cpuLoad: 42, gpuLoad: 88, ramUsage: 70, temperature: 55
    });

    const panel = mockContainer.querySelector('.ods-status-panel');
    expect(panel?.textContent).toContain('42%');
    expect(panel?.textContent).toContain('88%');
    expect(panel?.textContent).toContain('55°C');
    expect(mockContainer.querySelector('.ods-status-online')).not.toBeNull();
  });
});