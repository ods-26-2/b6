/**
 * @ods/b6-overlay-player
 * Responsável: Eduardo Gomes
 * Descrição: Player de Vídeo com renderização sincronizada por intervalos temporais (Quadro Correto).
 * Diretrizes: Clean Code, Sincronização a 60fps (requestAnimationFrame).
 */

export interface PlayerOptions {
  containerId: string;
  videoUrl?: string;
  autoPlay?: boolean;
}

export interface BoundingBox {
  id: string;
  label: string;
  color: string;
  x: number; // Normalizado [0.0, 1.0]
  y: number; // Normalizado [0.0, 1.0]
  width: number; // Normalizado [0.0, 1.0]
  height: number; // Normalizado [0.0, 1.0]
}

// Alterado de timestamp único para intervalo (startTime e endTime)
export interface FrameIntervalMetadata {
  startTime: number; // Início do intervalo em segundos (Ex: 1.0)
  endTime: number;   // Fim do intervalo em segundos (Ex: 4.5)
  boxes: BoundingBox[];
}

export class OverlayPlayer {
  private container!: HTMLElement;
  private videoWrapper!: HTMLDivElement;
  private video!: HTMLVideoElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  // UI
  private controlsWrapper!: HTMLDivElement;
  private playPauseBtn!: HTMLButtonElement;
  private progressBar!: HTMLInputElement;
  private timeDisplay!: HTMLSpanElement;
  private muteBtn!: HTMLButtonElement;
  private fullscreenBtn!: HTMLButtonElement;

  private isDraggingProgress: boolean = false;

  // Motor de Sincronização por Intervalos
  private timelineData: FrameIntervalMetadata[] = [];
  private animationFrameId: number | null = null;

  constructor(options: PlayerOptions) {
    const el = document.getElementById(options.containerId);
    if (!el) throw new Error(`Contentor '${options.containerId}' não localizado.`);

    this.container = el;
    this.injectStyles();
    this.buildDOM();
    this.bindEvents();

    if (options.videoUrl) {
      this.loadVideo(options.videoUrl);
      if (options.autoPlay) {
        this.video.muted = true;
        this.muteBtn.innerText = '🔇';
        this.video.play().catch(err => console.warn("Autoplay bloqueado pelo navegador:", err));
      }
    }
  }

  // Permite ao Frontend ODS injetar o Array de intervalos de inferência (VOD)
  public loadMetadataTimeline(data: FrameIntervalMetadata[]): void {
    // Ordena os intervalos cronologicamente pelo tempo de início
    this.timelineData = data.sort((a, b) => a.startTime - b.startTime);
    this.forceRender();
  }

  private injectStyles(): void {
    if (document.getElementById('ods-player-styles')) return;

    const style = document.createElement('style');
    style.id = 'ods-player-styles';
    style.textContent = `
      .ods-player-container {
        width: 100%;
        max-width: 1000px;
        background: #000;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        font-family: sans-serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
      }
      .ods-video-wrapper {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        background: #111;
        overflow: hidden;
      }
      .ods-video-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .ods-canvas-layer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
      }
      .ods-controls {
        width: 100%;
        height: 50px;
        background: #1a1a1a;
        display: flex;
        align-items: center;
        padding: 0 15px;
        box-sizing: border-box;
        gap: 15px;
        border-top: 1px solid #333;
      }
      .ods-btn {
        background: none; border: none; color: white; font-size: 16px;
        cursor: pointer; padding: 5px; min-width: 35px; transition: color 0.2s;
      }
      .ods-btn:hover { color: #2196F3; }
      .ods-progress-container { flex-grow: 1; display: flex; align-items: center; }
      .ods-progress { width: 100%; cursor: pointer; accent-color: #2196F3; }
      .ods-time { color: white; font-size: 13px; min-width: 90px; text-align: center; user-select: none; }
    `;
    document.head.appendChild(style);
  }

  private buildDOM(): void {
    this.container.classList.add('ods-player-container');

    this.videoWrapper = document.createElement('div');
    this.videoWrapper.className = 'ods-video-wrapper';

    this.video = document.createElement('video');
    this.video.className = 'ods-video-layer';
    this.video.preload = 'auto';
    this.video.playsInline = true;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ods-canvas-layer';
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error("Canvas2D não suportado.");
    this.ctx = context;

    this.videoWrapper.appendChild(this.video);
    this.videoWrapper.appendChild(this.canvas);

    this.controlsWrapper = document.createElement('div');
    this.controlsWrapper.className = 'ods-controls';

    this.playPauseBtn = this.createButton('▶');

    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'ods-progress-container';
    this.progressBar = document.createElement('input');
    this.progressBar.type = 'range';
    this.progressBar.className = 'ods-progress';
    this.progressBar.min = '0';
    this.progressBar.max = '100';
    this.progressBar.value = '0';
    progressWrapper.appendChild(this.progressBar);

    this.timeDisplay = document.createElement('span');
    this.timeDisplay.className = 'ods-time';
    this.timeDisplay.innerText = '00:00 / 00:00';

    this.muteBtn = this.createButton('🔊');
    this.fullscreenBtn = this.createButton('⛶');

    this.controlsWrapper.appendChild(this.playPauseBtn);
    this.controlsWrapper.appendChild(progressWrapper);
    this.controlsWrapper.appendChild(this.timeDisplay);
    this.controlsWrapper.appendChild(this.muteBtn);
    this.controlsWrapper.appendChild(this.fullscreenBtn);

    this.container.appendChild(this.videoWrapper);
    this.container.appendChild(this.controlsWrapper);
  }

  private createButton(icon: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'ods-btn';
    btn.innerText = icon;
    return btn;
  }

  private bindEvents(): void {
    this.playPauseBtn.addEventListener('click', () => this.togglePlay());
    this.muteBtn.addEventListener('click', () => this.toggleMute());
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    this.video.addEventListener('click', () => this.togglePlay());

    this.progressBar.addEventListener('input', () => { this.isDraggingProgress = true; });
    this.progressBar.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.video.currentTime = (parseFloat(target.value) / 100) * this.video.duration;
      this.isDraggingProgress = false;
      this.forceRender();
    });

    this.video.addEventListener('play', () => {
      this.playPauseBtn.innerText = '⏸';
      this.startRenderLoop();
    });

    this.video.addEventListener('pause', () => {
      this.playPauseBtn.innerText = '▶';
      this.stopRenderLoop();
    });

    this.video.addEventListener('seeked', () => this.forceRender());

    this.video.addEventListener('timeupdate', () => {
      this.updateTimeDisplay();
      if (!this.isDraggingProgress && this.video.duration) {
        this.progressBar.value = ((this.video.currentTime / this.video.duration) * 100).toString();
      }
    });

    this.video.addEventListener('loadedmetadata', () => {
      this.updateTimeDisplay();
    });

    const resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.forceRender();
    });
    resizeObserver.observe(this.videoWrapper);
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.drawCurrentFrame();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private forceRender(): void {
    this.drawCurrentFrame();
  }

  // --- MOTOR DE VERIFICAÇÃO DE INTERVALOS ---
  private drawCurrentFrame(): void {
    if (!this.ctx || this.timelineData.length === 0) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const currentTime = this.video.currentTime;

    // Recolhe todos os intervalos ativos para o segundo atual (suporta múltiplas caixas em simultâneo)
    const activeIntervals = this.timelineData.filter(
      item => currentTime >= item.startTime && currentTime <= item.endTime
    );

    activeIntervals.forEach(interval => {
      interval.boxes.forEach(box => {
        const pixelX = box.x * this.canvas.width;
        const pixelY = box.y * this.canvas.height;
        const pixelWidth = box.width * this.canvas.width;
        const pixelHeight = box.height * this.canvas.height;

        // Desenha a Bounding Box
        this.ctx.strokeStyle = box.color;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);

        // Desenha o Rótulo
        this.ctx.fillStyle = box.color;
        this.ctx.font = 'bold 14px Arial';
        const textWidth = this.ctx.measureText(box.label).width;

        this.ctx.fillRect(pixelX, pixelY - 25, textWidth + 10, 25);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText(box.label, pixelX + 5, pixelY - 7);
      });
    });
  }

  public loadVideo(url: string): void {
    this.video.src = url;
    this.video.load();
  }

  private togglePlay(): void {
    if (this.video.paused || this.video.ended) this.video.play();
    else this.video.pause();
  }

  private toggleMute(): void {
    this.video.muted = !this.video.muted;
    this.muteBtn.innerText = this.video.muted ? '🔇' : '🔊';
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) this.container.requestFullscreen().catch(() => { });
    else document.exitFullscreen();
  }

  private updateTimeDisplay(): void {
    this.timeDisplay.innerText = `${this.formatTime(this.video.currentTime)} / ${this.formatTime(this.video.duration)}`;
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private resizeCanvas(): void {
    if (this.canvas.clientWidth > 0 && this.canvas.clientHeight > 0) {
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
    }
  }
}