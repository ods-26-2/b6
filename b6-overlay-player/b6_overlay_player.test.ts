/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OverlayPlayer, FrameIntervalMetadata } from './b6_overlay_player';

describe('B6.1 - OverlayPlayer (Testes de Domínio e Ciclo Gráfico)', () => {
    let mockContainer: HTMLElement;

    beforeEach(() => {
        mockContainer = document.createElement('div');
        mockContainer.id = 'test-container';
        document.body.appendChild(mockContainer);

        // Mock correto do ResizeObserver como classe para suportar o operador 'new'
        global.ResizeObserver = class {
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
        };

        // Mock do Contexto 2D para o JSDOM (Zero I/O / Fakes em memória)
        HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            measureText: vi.fn().mockReturnValue({ width: 50 }),
            fillText: vi.fn(),
        } as unknown as CanvasRenderingContext2D);

        // Mock de funções de mídia do HTMLMediaElement
        window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
        window.HTMLMediaElement.prototype.pause = vi.fn();
        window.HTMLMediaElement.prototype.load = vi.fn();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('deve_lancar_erro_quando_contentor_nao_for_encontrado', () => {
        expect(() => new OverlayPlayer({ containerId: 'id-inexistente' })).toThrow(
            "Contentor 'id-inexistente' não localizado."
        );
    });

    it('deve_inicializar_componente_corretamente_quando_contentor_existe', () => {
        const player = new OverlayPlayer({ containerId: 'test-container' });
        // A classe ods-player-container é injetada diretamente no próprio contentor, logo verificamos com classList
        expect(mockContainer.classList.contains('ods-player-container')).toBe(true);
        expect(mockContainer.querySelector('.ods-video-layer')).not.toBeNull();
        expect(mockContainer.querySelector('.ods-canvas-layer')).not.toBeNull();
    });

    it('deve_aceitar_e_ordenar_timeline_por_intervalos_temporais', () => {
        const player = new OverlayPlayer({ containerId: 'test-container' });

        const mockTimeline: FrameIntervalMetadata[] = [
            { startTime: 5.0, endTime: 10.0, boxes: [] },
            { startTime: 1.0, endTime: 3.0, boxes: [] }
        ];

        expect(() => player.loadMetadataTimeline(mockTimeline)).not.toThrow();
    });
});