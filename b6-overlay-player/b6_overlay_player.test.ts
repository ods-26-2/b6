/**
 * Testes Unitários para @ods/b6-overlay-player (B6.1)
 * Diretrizes: Zero I/O, Nomenclatura Obrigatória conforme Squad MOD-2.
 */
import { describe, it, expect, vi } from 'vitest';
import { Canvas2DRenderStrategy, OverlayMetadata, RenderInitializationError } from './b6_overlay_player';

describe('B6.1 - Canvas2DRenderStrategy', () => {

    it('deve_lancar_excecao_quando_canvas_nao_suportar_contexto_2d', () => {
        const strategy = new Canvas2DRenderStrategy();

        // Mock de HTMLCanvasElement que retorna null para getContext
        const mockCanvas = {
            getContext: vi.fn().mockReturnValue(null)
        } as unknown as HTMLCanvasElement;

        expect(() => strategy.initialize(mockCanvas)).toThrowError(RenderInitializationError);
    });

    it('deve_limpar_o_canvas_antes_de_renderizar_quando_receber_novos_metadados', () => {
        const strategy = new Canvas2DRenderStrategy();

        const mockCtx = {
            canvas: { width: 800, height: 600 },
            clearRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            closePath: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            strokeRect: vi.fn(),
            fillText: vi.fn()
        };

        const mockCanvas = {
            getContext: vi.fn().mockReturnValue(mockCtx)
        } as unknown as HTMLCanvasElement;

        const dummyMetadata: OverlayMetadata = { boxes: [], zones: [] };

        strategy.initialize(mockCanvas);
        strategy.render(dummyMetadata, 800, 600);

        // Garante que a limpeza do ecrã foi executada no início do ciclo
        expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });
});