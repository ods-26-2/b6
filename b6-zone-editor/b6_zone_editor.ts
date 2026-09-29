/**
 * @ods/b6-zone-editor
 * Responsável: Eduardo Gomes
 * Descrição: Editor gráfico (Multi-Zonas, Adição/Exclusão de Pontos e Arraste de Zona Inteira).
 * Diretrizes: Clean Code, Design Patterns, Coordenadas Normalizadas [0.0, 1.0].
 */

export interface Point {
  x: number;
  y: number;
}

export interface ZonePayload {
  zone_id: string;
  name: string;
  type: string;
  points: Point[];
}

export class ODSUIException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ODSUIException';
  }
}

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

        if (this.doIntersect(p1, q1, p2, q2)) return false;
      }
    }
    return true;
  }

  private static doIntersect(p1: Point, q1: Point, p2: Point, q2: Point): boolean {
    const o1 = this.orientation(p1, q1, p2);
    const o2 = this.orientation(p1, q1, q2);
    const o3 = this.orientation(p2, q2, p1);
    const o4 = this.orientation(p2, q2, q1);
    return (o1 !== o2 && o3 !== o4);
  }

  private static orientation(p: Point, q: Point, r: Point): number {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0;
    return val > 0 ? 1 : 2;
  }
}

export class ZoneEditor {
  private containerElement: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  private completedZones: Point[][] = [];
  private currentZone: Point[] = [];
  private isDrawingMode: boolean = false;
  
  // Atualizado para suportar o arraste de zona inteira
  private dragTarget: { 
    zoneIndex: number; 
    pointIndex: number | null; 
    initialZone?: Point[]; 
    startNormX?: number; 
    startNormY?: number; 
  } | null = null;
  
  private hoverTarget: { zoneIndex: number, pointIndex: number | null, edgeIndex: number | null } | null = null;

  private readonly HANDLE_RADIUS = 6; 
  private readonly EDGE_TOLERANCE = 8; 

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new ODSUIException(`Contentor '${containerId}' não localizado.`);
    
    this.containerElement = container;
    this.containerElement.style.position = 'relative';

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    
    this.containerElement.appendChild(this.canvas);
    
    const context = this.canvas.getContext('2d');
    if (!context) throw new ODSUIException('Canvas2D não suportado.');
    this.ctx = context;

    this.bindEvents();
    this.handleResize();
  }

  public startDrawingMode(): void {
    console.log("[Editor] Modo de Desenho INICIADO");
    this.isDrawingMode = true;
    this.render();
  }

  public stopDrawingMode(): void {
    console.log("[Editor] Modo de Desenho PARADO");
    this.isDrawingMode = false;
    this.currentZone = [];
    this.render();
  }

  public clearAll(): void {
    console.log("[Editor] Tudo limpo.");
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

  private bindEvents(): void {
    window.addEventListener('resize', () => this.handleResize());
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => { 
      e.preventDefault(); 
      this.onContextMenu(e);
    });
  }

  private handleResize(): void {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.render();
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;

    const { normX, normY } = this.getNormalizedCoordinates(e);
    const hit = this.getHitTarget(e.offsetX, e.offsetY);

    if (hit) {
      if (hit.pointIndex !== null) {
        console.log(`[Arraste] Ponto ${hit.pointIndex} da zona ${hit.zoneIndex} selecionado.`);
        this.dragTarget = { zoneIndex: hit.zoneIndex, pointIndex: hit.pointIndex };
        return;
      } else if (hit.edgeIndex !== null) {
        console.log(`[Adição] Novo ponto inserido na aresta ${hit.edgeIndex} da zona ${hit.zoneIndex}.`);
        const pts = this.completedZones[hit.zoneIndex];
        const insertIndex = hit.edgeIndex + 1;
        pts.splice(insertIndex, 0, { x: normX, y: normY });
        this.dragTarget = { zoneIndex: hit.zoneIndex, pointIndex: insertIndex };
        return;
      } else {
        // Clicou no interior da zona: inicia o arraste da zona completa
        console.log(`[Movimento] Zona inteira ${hit.zoneIndex} selecionada para mover.`);
        this.dragTarget = {
          zoneIndex: hit.zoneIndex,
          pointIndex: null,
          initialZone: this.completedZones[hit.zoneIndex].map(p => ({ ...p })), // Cópia imutável do estado inicial
          startNormX: normX,
          startNormY: normY
        };
        return;
      }
    }

    if (this.isDrawingMode) {
      console.log(`[Desenho] Novo ponto inicial adicionado: x:${normX.toFixed(2)}, y:${normY.toFixed(2)}`);
      this.currentZone.push({ x: normX, y: normY });
      this.render();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const { normX, normY } = this.getNormalizedCoordinates(e);

    if (this.dragTarget) {
      const { zoneIndex, pointIndex, initialZone, startNormX, startNormY } = this.dragTarget;
      
      if (pointIndex !== null) {
        // --- MOVER UM PONTO ÚNICO ---
        const targetPolygon = zoneIndex === -1 ? this.currentZone : this.completedZones[zoneIndex];
        const originalPoint = { ...targetPolygon[pointIndex] };
        
        targetPolygon[pointIndex] = { x: normX, y: normY };
        
        if (!PolygonValidator.isValidPolygon(targetPolygon)) {
          targetPolygon[pointIndex] = originalPoint;
          this.canvas.style.cursor = 'not-allowed';
        } else {
          this.canvas.style.cursor = 'grabbing';
        }
      } else if (initialZone && startNormX !== undefined && startNormY !== undefined) {
        // --- MOVER A ZONA INTEIRA ---
        this.canvas.style.cursor = 'move';
        
        let deltaX = normX - startNormX;
        let deltaY = normY - startNormY;

        // Calcula as bounding boxes para não deixar a zona fugir do ecrã
        const minX = Math.min(...initialZone.map(p => p.x));
        const maxX = Math.max(...initialZone.map(p => p.x));
        const minY = Math.min(...initialZone.map(p => p.y));
        const maxY = Math.max(...initialZone.map(p => p.y));

        if (minX + deltaX < 0) deltaX = -minX;
        if (maxX + deltaX > 1) deltaX = 1 - maxX;
        if (minY + deltaY < 0) deltaY = -minY;
        if (maxY + deltaY > 1) deltaY = 1 - maxY;

        // Aplica o deslocamento a todos os vértices da zona em simultâneo
        this.completedZones[zoneIndex] = initialZone.map(p => ({
          x: p.x + deltaX,
          y: p.y + deltaY
        }));
      }
      this.render();
    } else {
      this.hoverTarget = this.getHitTarget(e.offsetX, e.offsetY);
      
      if (this.hoverTarget) {
        if (this.hoverTarget.pointIndex !== null) this.canvas.style.cursor = 'grab';
        else if (this.hoverTarget.edgeIndex !== null) this.canvas.style.cursor = 'copy';
        else this.canvas.style.cursor = 'move'; // Cursor indicativo de arraste de zona
      } else {
        this.canvas.style.cursor = this.isDrawingMode ? 'crosshair' : 'default';
      }

      this.render();
      if (this.isDrawingMode) this.drawGuideLine(e.offsetX, e.offsetY);
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.dragTarget = null;
      if (!this.hoverTarget) this.canvas.style.cursor = this.isDrawingMode ? 'crosshair' : 'default';
    }
  }

  private onContextMenu(e: MouseEvent): void {
    console.log("[Context Menu] Botão direito pressionado.");
    
    const hit = this.getHitTarget(e.offsetX, e.offsetY);

    if (hit) {
      if (hit.pointIndex !== null) {
        console.log(`[Exclusão] A apagar ponto ${hit.pointIndex} da zona ${hit.zoneIndex}.`);
        this.removePoint(hit.zoneIndex, hit.pointIndex);
        return;
      } else if (hit.zoneIndex >= 0 && hit.edgeIndex === null) {
        console.log(`[Exclusão] A apagar zona inteira ${hit.zoneIndex}.`);
        this.removeZone(hit.zoneIndex);
        return;
      }
    }

    if (this.isDrawingMode && this.currentZone.length > 0) {
      console.log("[Context Menu] A tentar fechar a zona atual...");
      this.closeCurrentZone();
    }
  }

  private removePoint(zoneIndex: number, pointIndex: number): void {
    if (zoneIndex === -1) {
      this.currentZone.splice(pointIndex, 1);
    } else {
      const poly = [...this.completedZones[zoneIndex]];
      poly.splice(pointIndex, 1);
      
      if (poly.length < 3) {
        this.removeZone(zoneIndex);
      } else if (PolygonValidator.isValidPolygon(poly)) {
        this.completedZones[zoneIndex] = poly;
      } else {
        alert("Não é possível remover este ponto: o polígono ficaria cruzado.");
      }
    }
    this.hoverTarget = null;
    this.render();
  }

  private removeZone(zoneIndex: number): void {
    this.completedZones.splice(zoneIndex, 1);
    this.hoverTarget = null;
    this.render();
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

    this.completedZones.push([...this.currentZone]);
    this.currentZone = [];
    console.log("[Desenho] Zona fechada com sucesso!");
    this.render();
  }

  private getNormalizedCoordinates(e: MouseEvent): { normX: number, normY: number } {
    return {
      normX: Math.max(0, Math.min(1, e.offsetX / this.canvas.width)),
      normY: Math.max(0, Math.min(1, e.offsetY / this.canvas.height))
    };
  }

  private getHitTarget(pixelX: number, pixelY: number): { zoneIndex: number, pointIndex: number | null, edgeIndex: number | null } | null {
    for (let i = 0; i < this.currentZone.length; i++) {
      if (Math.hypot(pixelX - this.currentZone[i].x * this.canvas.width, pixelY - this.currentZone[i].y * this.canvas.height) <= this.HANDLE_RADIUS * 2) {
        return { zoneIndex: -1, pointIndex: i, edgeIndex: null };
      }
    }
    for (let z = 0; z < this.completedZones.length; z++) {
      for (let i = 0; i < this.completedZones[z].length; i++) {
        if (Math.hypot(pixelX - this.completedZones[z][i].x * this.canvas.width, pixelY - this.completedZones[z][i].y * this.canvas.height) <= this.HANDLE_RADIUS * 2) {
          return { zoneIndex: z, pointIndex: i, edgeIndex: null };
        }
      }
    }

    for (let z = 0; z < this.completedZones.length; z++) {
      const pts = this.completedZones[z];
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        if (this.pointToSegmentDistance(pixelX, pixelY, p1.x * this.canvas.width, p1.y * this.canvas.height, p2.x * this.canvas.width, p2.y * this.canvas.height) <= this.EDGE_TOLERANCE) {
          return { zoneIndex: z, pointIndex: null, edgeIndex: i };
        }
      }
    }

    for (let z = 0; z < this.completedZones.length; z++) {
      const pts = this.completedZones[z];
      if (pts.length < 3) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(pts[0].x * this.canvas.width, pts[0].y * this.canvas.height);
      for (let i = 1; i < pts.length; i++) this.ctx.lineTo(pts[i].x * this.canvas.width, pts[i].y * this.canvas.height);
      this.ctx.closePath();
      if (this.ctx.isPointInPath(pixelX, pixelY)) return { zoneIndex: z, pointIndex: null, edgeIndex: null };
    }

    return null;
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const l2 = Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.completedZones.forEach((zone, zIndex) => this.drawPolygon(zone, true, '#00FF00', zIndex));
    if (this.currentZone.length > 0) this.drawPolygon(this.currentZone, false, '#FFA500', -1);
  }

  private drawPolygon(points: Point[], isClosed: boolean, color: string, zoneIndex: number): void {
    if (points.length === 0) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x * this.canvas.width, points[0].y * this.canvas.height);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x * this.canvas.width, points[i].y * this.canvas.height);
    }

    const isZoneHovered = this.hoverTarget?.zoneIndex === zoneIndex && this.hoverTarget?.pointIndex === null && this.hoverTarget?.edgeIndex === null;

    if (isClosed) {
      this.ctx.closePath();
      this.ctx.fillStyle = isZoneHovered ? 'rgba(255, 0, 0, 0.4)' : (color === '#00FF00' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 165, 0, 0.3)');
      this.ctx.fill();
    }

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = isZoneHovered ? '#FF0000' : color;
    this.ctx.stroke();

    if (isClosed && this.hoverTarget?.zoneIndex === zoneIndex && this.hoverTarget?.edgeIndex !== null) {
      const edgeIndex = this.hoverTarget.edgeIndex;
      this.ctx.beginPath();
      this.ctx.moveTo(points[edgeIndex].x * this.canvas.width, points[edgeIndex].y * this.canvas.height);
      this.ctx.lineTo(points[(edgeIndex + 1) % points.length].x * this.canvas.width, points[(edgeIndex + 1) % points.length].y * this.canvas.height);
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.stroke();
    }

    points.forEach((p, pIndex) => {
      const isPointHovered = this.hoverTarget?.zoneIndex === zoneIndex && this.hoverTarget?.pointIndex === pIndex;
      this.ctx.beginPath();
      this.ctx.arc(p.x * this.canvas.width, p.y * this.canvas.height, this.HANDLE_RADIUS, 0, Math.PI * 2);
      this.ctx.fillStyle = isPointHovered ? '#FF0000' : color; 
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