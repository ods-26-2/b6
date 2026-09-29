/**
 * @vitest-environment jsdom
 */

/**
 * Testes Unitários para @ods/b6-zone-editor (B6.2)
 * Diretrizes ODS: Zero I/O, Fakes em memória, Nomenclatura Obrigatória.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ZoneEditor, PolygonValidator, Point } from './b6_zone_editor';

describe('B6.2 - PolygonValidator (Validação Topológica de Domínio)', () => {

  it('deve_retornar_verdadeiro_quando_poligono_for_convexo_e_valido', () => {
    const validPolygon: Point[] = [
      { x: 0.1, y: 0.1 }, { x: 0.4, y: 0.1 }, { x: 0.4, y: 0.4 }, { x: 0.1, y: 0.4 }
    ];
    expect(PolygonValidator.isValidPolygon(validPolygon)).toBe(true);
  });

  it('deve_retornar_falso_quando_adicao_ou_arraste_cruzar_as_linhas', () => {
    // Simula o erro do utilizador ao arrastar um ponto formando uma "gravata"
    const selfIntersectingPolygon: Point[] = [
      { x: 0.1, y: 0.1 }, { x: 0.4, y: 0.4 }, { x: 0.4, y: 0.1 }, { x: 0.1, y: 0.4 }
    ];
    expect(PolygonValidator.isValidPolygon(selfIntersectingPolygon)).toBe(false);
  });

});

describe('B6.2 - ZoneEditor (Controlador de Múltiplas Zonas e Eventos)', () => {
  let mockContext: any;
  let mockCanvas: any;
  let mockContainer: any;
  let listeners: Record<string, EventListener> = {};

  beforeEach(() => {
    // 1. Configura Fakes em memória para evitar dependência do Browser real (Zero I/O)
    listeners = {};
    
    mockContext = {
      clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
      lineTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(),
      stroke: vi.fn(), arc: vi.fn(), setLineDash: vi.fn(),
      isPointInPath: vi.fn().mockReturnValue(false) // Falso por defeito para testes
    };

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 800, height: 600, clientWidth: 800, clientHeight: 600,
      style: {},
      addEventListener: vi.fn((event, callback) => {
        listeners[event] = callback;
      })
    };

    mockContainer = {
      appendChild: vi.fn(), style: {}
    };

    vi.spyOn(document, 'getElementById').mockReturnValue(mockContainer as any);
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Utilitário para disparar os eventos de rato capturados no Fake Canvas
  const fireMouseEvent = (type: string, offsetX: number, offsetY: number, button: number = 0) => {
    if (listeners[type]) {
      listeners[type]({ offsetX, offsetY, button, preventDefault: vi.fn() } as unknown as MouseEvent);
    }
  };

  it('deve_exportar_array_vazio_quando_editor_for_iniciado_sem_desenhos', () => {
    const editor = new ZoneEditor('dummy-id');
    const payloads = editor.exportAllZones('Zona_Teste', 'DANGER');
    
    expect(payloads).toEqual([]);
  });

  it('deve_limpar_memoria_e_estado_quando_clearAll_for_acionado', () => {
    const editor = new ZoneEditor('dummy-id');
    editor.startDrawingMode();
    
    // Simula a criação de um ponto
    fireMouseEvent('mousedown', 100, 100, 0); 
    
    editor.clearAll();
    
    // Garante que a exportação está limpa e o modo foi interrompido com segurança
    expect(editor.exportAllZones('Zona_Teste', 'WARNING')).toEqual([]);
  });

  it('deve_criar_e_fechar_zona_quando_receber_sequencia_de_eventos_do_rato', () => {
    const editor = new ZoneEditor('dummy-id');
    editor.startDrawingMode();

    // 1. Desenha um triângulo simples (Botão Esquerdo = 0)
    fireMouseEvent('mousedown', 100, 100, 0); // Ponto 1 (Top-Left)
    fireMouseEvent('mousedown', 400, 100, 0); // Ponto 2 (Top-Right)
    fireMouseEvent('mousedown', 250, 300, 0); // Ponto 3 (Bottom-Center)

    // 2. Fecha a zona numa área vazia (Botão Direito = 2)
    fireMouseEvent('contextmenu', 700, 500, 2); 

    // 3. Verifica o Payload Exportado
    const exported = editor.exportAllZones('Setor', 'DANGER');
    
    expect(exported).toHaveLength(1);
    expect(exported[0].name).toBe('Setor 1');
    expect(exported[0].points).toHaveLength(3);
    
    // Valida a conversão normalizada [0.0, 1.0] (100px / 800px = 0.125)
    expect(exported[0].points[0].x).toBeCloseTo(0.125); 
    expect(exported[0].points[0].y).toBeCloseTo(0.1666, 3); // (100px / 600px = ~0.166)
  });

  it('deve_remover_zona_inteira_quando_clique_direito_for_acionado_no_interior', () => {
    const editor = new ZoneEditor('dummy-id');
    editor.startDrawingMode();

    // Cria a zona inicial
    fireMouseEvent('mousedown', 100, 100, 0);
    fireMouseEvent('mousedown', 400, 100, 0);
    fireMouseEvent('mousedown', 250, 300, 0);
    fireMouseEvent('contextmenu', 700, 500, 2); // Fecha
    
    expect(editor.exportAllZones('Teste', 'DANGER')).toHaveLength(1);

    // Desliga o modo de desenho para simular o operador na edição
    editor.stopDrawingMode();

    // Simula que o rato está dentro da zona fechada
    mockContext.isPointInPath.mockReturnValue(true); 

    // Dispara o Botão Direito no "corpo" da zona
    fireMouseEvent('contextmenu', 200, 200, 2);

    // Valida que a zona foi apagada
    expect(editor.exportAllZones('Teste', 'DANGER')).toHaveLength(0);
  });

  it('deve_apagar_zona_automaticamente_quando_remocao_de_ponto_deixar_menos_que_tres_vertices', () => {
    const editor = new ZoneEditor('dummy-id');
    editor.startDrawingMode();

    // Cria triângulo
    fireMouseEvent('mousedown', 10, 10, 0);
    fireMouseEvent('mousedown', 50, 10, 0);
    fireMouseEvent('mousedown', 30, 50, 0);
    fireMouseEvent('contextmenu', 700, 500, 2); 

    editor.stopDrawingMode();

    // Dispara o clique direito (2) exatamente em cima do primeiro vértice
    fireMouseEvent('contextmenu', 10, 10, 2);

    // Como o triângulo ficou com apenas 2 pontos após a remoção, a lógica manda destruir a zona
    expect(editor.exportAllZones('Teste', 'DANGER')).toHaveLength(0);
  });

});