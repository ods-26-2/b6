/**
 * @ods/b6-zone-editor
 * Responsável: Eduardo Gomes
 * Descrição: Editor gráfico para múltiplas zonas, ajuste e serialização de polígonos.
 * Diretrizes: Clean Code, Design Patterns, Coordenadas Normalizadas [0.0, 1.0].
 */

// ==========================================
// 1. DTOs & Entidades de Domínio
// ==========================================

export interface Point {
  x: number; // Normalizado [0.0, 1.0]
  y: number; // Normalizado [0.0, 1.0]
}

export interface ZonePayload {
  zone_id: string;
  name: string;
  type: string;
  points: Point[];
}

// ==========================================
// 2. Exceções de Domínio
// ==========================================

export class ODSUIException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ODSUIException';
  }
}

export class TopologicalValidationError extends ODSUIException {
  constructor(message: string) {
    super(`Validação Topológica Falhou: ${message}`);
    this.name = 'TopologicalValidationError';
  }
}

// ==========================================
// 3. Validador Topológico
// ==========================================

export class PolygonValidator {
  public static isValidPolygon(points: Point[]): boolean {
    const n = points.length;
    if (n < 4) return true;

    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const q1 = points[(i + 1) % n];

      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;

        const p2 = points[j];
        const q2 = points[(j + 1) % n];

        if (this.doIntersect(p1, q1, p2, q2)) {
          return false;
        }
      }
    }
    return true;
  }

  private static doIntersect(p1: Point, q1: Point, p2: Point, q2: Point): boolean {
    const o1 = this.orientation(p1, q1, p2);
    const o2 = this.orientation(p1, q1, q2);
    const o3 = this.orientation(p2, q2, p1);
    const o4 = this.orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) return true;
    return false;
  }

  private static orientation(p: Point, q: Point, r: Point): number {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0;
    return val > 0 ? 1 : 2;
  }
}

// ==========================================
// 4. Componente Principal (Editor Multi-Zonas)
// ==========================================

export class ZoneEditor {
  private containerElement: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  // Estado de Múltiplas Zonas
  private completedZones: Point[][] = [];
  private currentZone: Point[] = [];
  
  // Controlo de Modo
  private isDrawingMode: boolean = false;
  
  // Estado de Interação (Drag & Drop)
  private dragTarget: { zoneIndex: number, pointIndex: number } | null = null;
  private hoverTarget: { zoneIndex: number, pointIndex: number } | null = null;

  private readonly HANDLE_RADIUS = 6; 

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new ODSUIException(`Contentor '${containerId}' não localizado.`);
    }
    this.containerElement = container;
    this.containerElement.style.position = 'relative';

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'default';
    
    this.containerElement.appendChild(this.canvas);
    
    const context = this.canvas.getContext('2d');
    if (!context) throw new ODSUIException('Canvas2D não suportado.');
    this.ctx = context;

    this.bindEvents();
    this.handleResize();
  }

  // --- API Pública de Controlo ---

  public startDrawingMode(): void {
    this.isDrawingMode = true;
    this.canvas.style.cursor = 'crosshair';
    this.render();
  }

  public stopDrawingMode(): void {
    this.isDrawingMode = false;
    this.currentZone = []; // Abandona a zona incompleta
    this.canvas.style.cursor = 'default';
    this.render();
  }

  public clearAll(): void {
    this.completedZones = [];
    this.currentZone = [];
    this.render();
  }

  public exportAllZones(baseName: string, type: string): ZonePayload[] {
    return this.completedZones.map((points, index) => ({
      zone_id: `zone_${Date.now()}_${index}`,
      name: `${baseName} ${index + 1}`,
      type: type,
      points: [...points]
    }));
  }

  // --- Eventos Internos ---

  private bindEvents(): void {
    window.addEventListener('resize', () => this.handleResize());
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => { 
      e.preventDefault(); 
      if (this.isDrawingMode) this.closeCurrentZone(); 
    });
  }

  private handleResize(): void {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.render();
  }

  // --- Lógica de Interação ---

  private onMouseDown(e: MouseEvent): void {
    const { normX, normY } = this.getNormalizedCoordinates(e);
    const hit = this.getHitTarget(e.offsetX, e.offsetY);

    if (hit) {
      // Começa a arrastar um ponto existente (mesmo fora do modo de desenho)
      this.dragTarget = hit;
      return;
    }

    if (this.isDrawingMode) {
      // Adiciona um novo ponto à zona atual
      this.currentZone.push({ x: normX, y: normY });
      this.render();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const { normX, normY } = this.getNormalizedCoordinates(e);

    if (this.dragTarget) {
      // Modo de Edição: Arrastar ponto
      const { zoneIndex, pointIndex } = this.dragTarget;
      const targetPolygon = zoneIndex === -1 ? this.currentZone : this.completedZones[zoneIndex];
      
      const originalPoint = { ...targetPolygon[pointIndex] };
      targetPolygon[pointIndex] = { x: normX, y: normY };
      
      // Validação Topológica Isolada para o polígono que está a ser editado
      if (!PolygonValidator.isValidPolygon(targetPolygon)) {
        targetPolygon[pointIndex] = originalPoint;
        this.canvas.style.cursor = 'not-allowed';
      } else {
        this.canvas.style.cursor = 'grabbing';
      }
      this.render();
    } else {
      // Efeito de Hover
      this.hoverTarget = this.getHitTarget(e.offsetX, e.offsetY);
      
      if (this.hoverTarget) {
        this.canvas.style.cursor = 'grab';
      } else {
        this.canvas.style.cursor = this.isDrawingMode ? 'crosshair' : 'default';
      }

      // Renderiza a linha guia se estiver a desenhar
      this.render();
      if (this.isDrawingMode) {
        this.drawGuideLine(e.offsetX, e.offsetY);
      }
    }
  }

  private onMouseUp(): void {
    this.dragTarget = null;
    if (!this.hoverTarget) {
      this.canvas.style.cursor = this.isDrawingMode ? 'crosshair' : 'default';
    }
  }

  private closeCurrentZone(): void {
    if (this.currentZone.length < 3) {
      alert("São necessários pelo menos 3 pontos para formar uma zona.");
      return;
    }
    
    if (!PolygonValidator.isValidPolygon(this.currentZone)) {
      alert("Polígono cruzado detetado. Ajuste os pontos antes de fechar.");
      return;
    }

    // Guarda a zona validada e limpa a área de desenho atual
    this.completedZones.push([...this.currentZone]);
    this.currentZone = [];
    this.render();
  }

  // --- Renderização e Matemática ---

  private getNormalizedCoordinates(e: MouseEvent): { normX: number, normY: number } {
    return {
      normX: Math.max(0, Math.min(1, e.offsetX / this.canvas.width)),
      normY: Math.max(0, Math.min(1, e.offsetY / this.canvas.height))
    };
  }

  private getHitTarget(pixelX: number, pixelY: number): { zoneIndex: number, pointIndex: number } | null {
    // 1. Verifica os pontos da zona em desenho (zoneIndex: -1)
    for (let i = 0; i < this.currentZone.length; i++) {
      const px = this.currentZone[i].x * this.canvas.width;
      const py = this.currentZone[i].y * this.canvas.height;
      if (Math.hypot(pixelX - px, pixelY - py) <= this.HANDLE_RADIUS * 2) {
        return { zoneIndex: -1, pointIndex: i };
      }
    }
    
    // 2. Verifica as zonas já concluídas
    for (let z = 0; z < this.completedZones.length; z++) {
      for (let i = 0; i < this.completedZones[z].length; i++) {
        const px = this.completedZones[z][i].x * this.canvas.width;
        const py = this.completedZones[z][i].y * this.canvas.height;
        if (Math.hypot(pixelX - px, pixelY - py) <= this.HANDLE_RADIUS * 2) {
          return { zoneIndex: z, pointIndex: i };
        }
      }
    }
    return null;
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Desenha zonas concluídas
    this.completedZones.forEach((zone, zIndex) => {
      this.drawPolygon(zone, true, '#00FF00', zIndex); // Verde para zonas finalizadas
    });

    // Desenha a zona atualmente em construção
    if (this.currentZone.length > 0) {
      this.drawPolygon(this.currentZone, false, '#FFA500', -1); // Laranja para a zona ativa
    }
  }

  private drawPolygon(points: Point[], isClosed: boolean, color: string, zoneIndex: number): void {
    if (points.length === 0) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x * this.canvas.width, points[0].y * this.canvas.height);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x * this.canvas.width, points[i].y * this.canvas.height);
    }

    if (isClosed) {
      this.ctx.closePath();
      this.ctx.fillStyle = color === '#00FF00' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 165, 0, 0.3)';
      this.ctx.fill();
    }

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = color;
    this.ctx.stroke();

    // Desenha os manipuladores (handles)
    points.forEach((p, pIndex) => {
      const isHovered = this.hoverTarget?.zoneIndex === zoneIndex && this.hoverTarget?.pointIndex === pIndex;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x * this.canvas.width, p.y * this.canvas.height, this.HANDLE_RADIUS, 0, Math.PI * 2);
      this.ctx.fillStyle = isHovered ? '#FFF' : color;
      this.ctx.fill();
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }

  private drawGuideLine(mouseX: number, mouseY: number): void {
    if (this.currentZone.length === 0) return;
    const lastPoint = this.currentZone[this.currentZone.length - 1];
    
    this.ctx.beginPath();
    this.ctx.moveTo(lastPoint.x * this.canvas.width, lastPoint.y * this.canvas.height);
    this.ctx.lineTo(mouseX, mouseY);
    this.ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
    this.ctx.setLineDash([5, 5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }
}
