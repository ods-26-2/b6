/**
 * @ods/b6-overlay-player
 * Responsável: Eduardo Gomes
 * Descrição: Player de vídeo com renderização acelerada de bounding boxes e zonas.
 * Diretrizes: Clean Code, Design Patterns (Strategy), Clean Architecture.
 */

// ==========================================
// 1. DTOs & Entidades de Domínio
// ==========================================

export interface Point {
  x: number; // Coordenada normalizada [0.0, 1.0]
  y: number; // Coordenada normalizada [0.0, 1.0]
}

export interface BoundingBox {
  id: string;
  x: number;      // Normalizado [0.0, 1.0]
  y: number;      // Normalizado [0.0, 1.0]
  width: number;  // Normalizado [0.0, 1.0]
  height: number; // Normalizado [0.0, 1.0]
  label?: string;
  color?: string;
}

export interface Zone {
  zone_id: string;
  name: string;
  type: string;
  points: Point[]; // Normalizado [0.0, 1.0]
  color?: string;
}

export interface OverlayMetadata {
  boxes: BoundingBox[];
  zones: Zone[];
}

// ==========================================
// 2. Exceções (Hierarquia Estrita)
// ==========================================

export class ODSUIException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ODSUIException';
  }
}

export class RenderInitializationError extends ODSUIException {
  constructor(message: string) {
    super(`Erro de Inicialização de Renderização: ${message}`);
    this.name = 'RenderInitializationError';
  }
}

// ==========================================
// 3. Padrão Strategy (Renderização)
// Permite alternar entre Canvas2D e WebGL
// ==========================================

export interface IRenderStrategy {
  initialize(canvas: HTMLCanvasElement): void;
  render(metadata: OverlayMetadata, width: number, height: number): void;
  clear(): void;
}

export class Canvas2DRenderStrategy implements IRenderStrategy {
  private ctx: CanvasRenderingContext2D | null = null;

  public initialize(canvas: HTMLCanvasElement): void {
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      throw new RenderInitializationError('Falha ao obter o contexto Canvas2D.');
    }
  }

  public render(metadata: OverlayMetadata, width: number, height: number): void {
    if (!this.ctx) return;
    this.clear();

    // Renderiza as zonas baseadas em polígonos
    metadata.zones.forEach((zone) => this.drawZone(zone, width, height));

    // Renderiza as bounding boxes de detecção
    metadata.boxes.forEach((box) => this.drawBox(box, width, height));
  }

  public clear(): void {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
  }

  private drawZone(zone: Zone, width: number, height: number): void {
    if (!this.ctx || zone.points.length === 0) return;

    this.ctx.beginPath();
    const startPoint = zone.points[0];
    this.ctx.moveTo(startPoint.x * width, startPoint.y * height);

    for (let i = 1; i < zone.points.length; i++) {
      const point = zone.points[i];
      this.ctx.lineTo(point.x * width, point.y * height);
    }
    this.ctx.closePath();

    // Estilo visual da zona de risco
    this.ctx.fillStyle = zone.color ? `${zone.color}33` : 'rgba(255, 0, 0, 0.2)';
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = zone.color || 'red';
    this.ctx.stroke();
  }

  private drawBox(box: BoundingBox, width: number, height: number): void {
    if (!this.ctx) return;

    const x = box.x * width;
    const y = box.y * height;
    const w = box.width * width;
    const h = box.height * height;

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = box.color || '#00FF00';
    this.ctx.strokeRect(x, y, w, h);

    if (box.label) {
      this.ctx.fillStyle = box.color || '#00FF00';
      this.ctx.font = '14px "Inter", sans-serif';
      this.ctx.fillText(box.label, x, y - 6);
    }
  }
}

// ==========================================
// 4. Componente Principal (Facade / Controller)
// ==========================================

export class OverlayPlayer {
  private containerElement: HTMLElement;
  private videoElement: HTMLVideoElement;
  private canvasElement: HTMLCanvasElement;
  private renderStrategy: IRenderStrategy;
  
  private animationFrameId: number | null = null;
  private currentMetadata: OverlayMetadata = { boxes: [], zones: [] };
  private isPlaying: boolean = false;

  constructor(
    containerId: string,
    strategy: IRenderStrategy = new Canvas2DRenderStrategy()
  ) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new ODSUIException(`Contêiner principal '${containerId}' não localizado no DOM.`);
    }
    this.containerElement = container;
    
    // Configura o layout de sobreposição
    this.containerElement.style.position = 'relative';
    this.containerElement.style.overflow = 'hidden';

    // Camada Inferior: Vídeo acelerado
    this.videoElement = document.createElement('video');
    this.videoElement.style.width = '100%';
    this.videoElement.style.height = '100%';
    this.videoElement.style.objectFit = 'contain';
    this.videoElement.autoplay = true;
    this.videoElement.muted = true; 
    this.videoElement.playsInline = true;

    // Camada Superior: Renderização Vetorial (Overlay)
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.style.position = 'absolute';
    this.canvasElement.style.top = '0';
    this.canvasElement.style.left = '0';
    this.canvasElement.style.width = '100%';
    this.canvasElement.style.height = '100%';
    this.canvasElement.style.pointerEvents = 'none'; // Permite cliques passarem para o vídeo ou para o editor

    this.containerElement.appendChild(this.videoElement);
    this.containerElement.appendChild(this.canvasElement);

    // Injeta a estratégia de renderização
    this.renderStrategy = strategy;
    this.renderStrategy.initialize(this.canvasElement);

    // Gerencia o redimensionamento fluido
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  /**
   * Conecta o player ao stream primário da Camada 1
   */
  public async connectStream(url: string): Promise<void> {
    // Exemplo de integração direta; em produção, usar APIs WebRTC (RTCPeerConnection)
    this.videoElement.src = url;
    await this.videoElement.play();
    this.startRenderLoop();
  }

  /**
   * Atualiza o estado das inferências e zonas recebidas do backend
   */
  public updateMetadata(metadata: OverlayMetadata): void {
    this.currentMetadata = metadata;
  }

  /**
   * Motor do loop de renderização travado a 60 FPS no navegador
   */
  private startRenderLoop(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const loop = () => {
      if (!this.isPlaying) return;

      // Mantém a matriz de pintura do canvas alinhada à dimensão física renderizada
      if (this.videoElement.videoWidth && this.videoElement.videoHeight) {
        if (this.canvasElement.width !== this.canvasElement.clientWidth) {
          this.canvasElement.width = this.canvasElement.clientWidth;
          this.canvasElement.height = this.canvasElement.clientHeight;
        }
      }

      this.renderStrategy.render(
        this.currentMetadata,
        this.canvasElement.width,
        this.canvasElement.height
      );

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.renderStrategy.clear();
    this.videoElement.pause();
  }

  private handleResize(): void {
    this.canvasElement.width = this.canvasElement.clientWidth;
    this.canvasElement.height = this.canvasElement.clientHeight;
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.videoElement.remove();
    this.canvasElement.remove();
  }
}