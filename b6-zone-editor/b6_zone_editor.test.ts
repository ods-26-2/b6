/**
 * Testes Unitários para @ods/b6-zone-editor (B6.2)
 * Diretrizes: Regras de Domínio puras e Validação Topológica.
 */
import { describe, it, expect } from 'vitest';
import { PolygonValidator, Point } from './b6_zone_editor';

describe('B6.2 - PolygonValidator (Validação Topológica)', () => {

    it('deve_retornar_verdadeiro_quando_poligono_for_convexo_e_valido', () => {
        // Quadrado simples sem cruzamentos (coordenadas normalizadas)
        const validPolygon: Point[] = [
            { x: 0.1, y: 0.1 },
            { x: 0.4, y: 0.1 },
            { x: 0.4, y: 0.4 },
            { x: 0.1, y: 0.4 }
        ];

        const isValid = PolygonValidator.isValidPolygon(validPolygon);
        expect(isValid).toBe(true);
    });

    it('deve_retornar_falso_quando_arestas_do_poligono_se_cruzarem', () => {
        // Polígono em forma de "gravata borboleta" (arestas cruzadas internamente)
        const selfIntersectingPolygon: Point[] = [
            { x: 0.1, y: 0.1 },
            { x: 0.4, y: 0.4 },
            { x: 0.4, y: 0.1 },
            { x: 0.1, y: 0.4 }
        ];

        const isValid = PolygonValidator.isValidPolygon(selfIntersectingPolygon);
        expect(isValid).toBe(false);
    });

    it('deve_retornar_verdadeiro_quando_tiver_menos_de_quatro_pontos', () => {
        // Triângulos nunca cruzam as próprias arestas internamente
        const triangle: Point[] = [
            { x: 0.2, y: 0.2 },
            { x: 0.5, y: 0.1 },
            { x: 0.3, y: 0.6 }
        ];

        const isValid = PolygonValidator.isValidPolygon(triangle);
        expect(isValid).toBe(true);
    });
});