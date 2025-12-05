/**
 * Sistema de Reconocimiento Facial usando API Python con DeepFace
 * Mucho más robusto que face-api.js
 */

interface WantedPerson {
  id: number;
  nombre: string;
  dni: string;
  delito: string;
  expediente: string;
  juzgado: string;
  fechaRequisitoria: string;
  imagen: string;
}

interface DetectionResult {
  isRequisitoriado: boolean;
  confidence: number;
  details?: WantedPerson;
  faceDetected?: boolean;
  faceName?: string;
}

interface PythonAPIResponse {
  success: boolean;
  face_detected: boolean;
  is_match: boolean;
  person_name: string;
  confidence: number;
  max_similarity: number;
  avg_similarity: number;
}

class WebcamDetector {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private startBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private scanBtn: HTMLButtonElement;
  private resultCard: HTMLElement;
  private resultContent: HTMLElement;
  private closeResult: HTMLButtonElement;
  private stream: MediaStream | null = null;
  private scanCount = 0;
  private matchCount = 0;
  private clearCount = 0;
  private apiReady = false;
  private personName: string | null = null;
  private detectionInterval: number | null = null;
  private API_URL = 'http://localhost:5000';

  private wantedPersons: WantedPerson[] = [
    {
      id: 1,
      nombre: 'Juan Carlos Mendoza Ríos',
      dni: '42536789',
      delito: 'Apropiación ilícita',
      expediente: '3245-2022-0',
      juzgado: '1er Juzgado Penal de Lima',
      fechaRequisitoria: '15/03/2022',
      imagen: 'persona1.png'
    },
    {
      id: 2,
      nombre: 'María Elena Gutiérrez Sánchez',
      dni: '38921456',
      delito: 'Estafa agravada',
      expediente: '5678-2021-0',
      juzgado: '2do Juzgado Penal de San Juan de Lurigancho',
      fechaRequisitoria: '08/11/2021',
      imagen: 'persona2.png'
    },
    {
      id: 3,
      nombre: 'Pedro Alberto Flores Torres',
      dni: '51234987',
      delito: 'Falsificación de documentos',
      expediente: '8932-2023-0',
      juzgado: '3er Juzgado Penal de Ate',
      fechaRequisitoria: '22/06/2023',
      imagen: 'persona3.png'
    },
    {
      id: 4,
      nombre: 'Rosa María Campos Díaz',
      dni: '47658321',
      delito: 'Incumplimiento de obligación alimentaria',
      expediente: '1456-2020-0',
      juzgado: 'Juzgado Penal de Villa El Salvador',
      fechaRequisitoria: '10/02/2020',
      imagen: 'persona4.png'
    }
  ];

  constructor() {
    this.video = document.getElementById('webcam') as HTMLVideoElement;
    this.canvas = document.getElementById('overlay') as HTMLCanvasElement;
    this.startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    this.stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    this.scanBtn = document.getElementById('scanBtn') as HTMLButtonElement;
    this.resultCard = document.getElementById('resultCard') as HTMLElement;
    this.resultContent = document.getElementById('resultContent') as HTMLElement;
    this.closeResult = document.getElementById('closeResult') as HTMLButtonElement;

    this.initializeEventListeners();
    this.renderWantedGallery();
    this.checkAPIStatus();
  }

  private async checkAPIStatus(): Promise<void> {
    try {
      this.showNotification('Conectando con API Python...', 'info');

      const response = await fetch(`${this.API_URL}/health`);
      const data = await response.json();

      if (data.status === 'ok') {
        this.apiReady = data.embeddings_loaded;
        this.personName = data.person;

        if (this.apiReady) {
          this.showNotification(
            `Sistema listo - Modelo: ${data.model} - Persona: ${this.personName}`,
            'success'
          );
        } else {
          this.showNotification(
            'API conectada pero no hay embeddings. Ejecuta: python train_model_python.py',
            'error'
          );
        }
      }
    } catch (error) {
      console.error('Error conectando con API:', error);
      this.showNotification(
        'No se pudo conectar con la API Python. Asegúrate de ejecutar: python face_recognition_api.py',
        'error'
      );
    }
  }

  private initializeEventListeners(): void {
    this.startBtn.addEventListener('click', () => this.startWebcam());
    this.stopBtn.addEventListener('click', () => this.stopWebcam());
    this.scanBtn.addEventListener('click', () => this.performScan());
    this.closeResult.addEventListener('click', () => this.hideResult());
  }

  private async startWebcam(): Promise<void> {
    try {
      if (!this.apiReady) {
        this.showNotification('Esperando a que la API esté lista...', 'info');
        return;
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      this.video.srcObject = this.stream;

      this.video.onloadedmetadata = () => {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
      };

      this.startBtn.disabled = true;
      this.stopBtn.disabled = false;
      this.scanBtn.disabled = false;

      this.showNotification('Cámara iniciada correctamente', 'success');

      // Detección automática cada 2 segundos (más lento que face-api.js porque usa API)
      this.startAutoDetection();
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      this.showNotification('Error al acceder a la cámara. Por favor, otorgue los permisos necesarios.', 'error');
    }
  }

  private startAutoDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }

    // Detección cada 2 segundos (API es más lenta pero más precisa)
    this.detectionInterval = window.setInterval(async () => {
      await this.detectFaceInVideo();
    }, 2000);
  }

  private async detectFaceInVideo(): Promise<void> {
    if (!this.video || this.video.paused || !this.apiReady) return;

    try {
      // Capturar frame actual
      const imageData = this.captureFrame();

      // Enviar a API Python
      const result = await this.recognizeFace(imageData);

      // Dibujar resultado
      this.drawDetectionResult(result);
    } catch (error) {
      console.error('Error en detección:', error);
    }
  }

  private captureFrame(): string {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.video.videoWidth;
    tempCanvas.height = this.video.videoHeight;
    const ctx = tempCanvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(this.video, 0, 0);
      return tempCanvas.toDataURL('image/jpeg', 0.8);
    }

    return '';
  }

  private async recognizeFace(imageData: string): Promise<PythonAPIResponse | null> {
    try {
      const response = await fetch(`${this.API_URL}/recognize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PythonAPIResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error en reconocimiento:', error);
      return null;
    }
  }

  private drawDetectionResult(result: PythonAPIResponse | null): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (result && result.face_detected) {
      // Dibujar rectángulo en el centro (simplificado)
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const boxWidth = 200;
      const boxHeight = 250;

      const x = centerX - boxWidth / 2;
      const y = centerY - boxHeight / 2;

      // Color según si es match o no
      const color = result.is_match ? '#00ff00' : '#ff4444';

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, boxWidth, boxHeight);

      // Texto con nombre y confianza
      ctx.fillStyle = color;
      ctx.font = 'bold 20px Arial';
      const text = result.is_match
        ? `${result.person_name} (${result.confidence.toFixed(1)}%)`
        : `Desconocido (${result.confidence.toFixed(1)}%)`;

      const textMetrics = ctx.measureText(text);
      const textX = centerX - textMetrics.width / 2;

      // Fondo para el texto
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(textX - 10, y - 35, textMetrics.width + 20, 30);

      // Texto
      ctx.fillStyle = color;
      ctx.fillText(text, textX, y - 10);
    }
  }

  private stopWebcam(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.video.srcObject = null;
    }

    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.scanBtn.disabled = true;

    this.showNotification('Cámara detenida', 'info');
  }

  private async performScan(): Promise<void> {
    if (!this.apiReady) {
      this.showNotification('La API aún no está lista', 'error');
      return;
    }

    this.scanBtn.disabled = true;
    this.scanBtn.innerHTML = `
      <svg class="btn-icon spinning" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Escaneando...
    `;

    this.showScanningAnimation();

    // Capturar frame
    const imageData = this.captureFrame();

    // Enviar a API
    const apiResult = await this.recognizeFace(imageData);

    const result = await this.convertAPIResultToDetectionResult(apiResult);
    this.scanCount++;

    if (result.isRequisitoriado) {
      this.matchCount++;
    } else {
      this.clearCount++;
    }

    this.updateStats();
    this.displayResult(result);

    this.scanBtn.disabled = false;
    this.scanBtn.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 7V5C3 3.89543 3.89543 3 5 3H7M17 3H19C20.1046 3 21 3.89543 21 5V7M21 17V19C21 20.1046 20.1046 21 19 21H17M7 21H5C3.89543 21 3 20.1046 3 19V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 8V16M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Escanear Persona
    `;
  }

  private async convertAPIResultToDetectionResult(apiResult: PythonAPIResponse | null): Promise<DetectionResult> {
    if (!apiResult) {
      return {
        isRequisitoriado: false,
        confidence: 0,
        faceDetected: false
      };
    }

    if (!apiResult.face_detected) {
      return {
        isRequisitoriado: false,
        confidence: 0,
        faceDetected: false
      };
    }

    if (apiResult.is_match) {
      return {
        isRequisitoriado: true,
        confidence: apiResult.confidence,
        faceDetected: true,
        faceName: apiResult.person_name
      };
    }

    return {
      isRequisitoriado: false,
      confidence: apiResult.confidence,
      faceDetected: true
    };
  }

  private renderWantedGallery(): void {
    const gallery = document.getElementById('wantedGallery') as HTMLElement;

    gallery.innerHTML = this.wantedPersons.map(person => `
      <div class="wanted-card">
        <div class="wanted-image-container">
          <img src="/${person.imagen}" alt="${person.nombre}" class="wanted-image" />
          <div class="wanted-badge">REQUISITORIADO</div>
        </div>
        <div class="wanted-info">
          <h4 class="wanted-name">${person.nombre}</h4>
          <div class="wanted-detail">
            <svg class="wanted-detail-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" stroke-width="2"/>
              <path d="M2.45825 12C3.73253 7.94288 7.52281 5 12 5C16.4772 5 20.2675 7.94291 21.5418 12C20.2675 16.0571 16.4772 19 12 19C7.52281 19 3.73253 16.0571 2.45825 12Z" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>DNI: ${person.dni}</span>
          </div>
          <div class="wanted-detail">
            <svg class="wanted-detail-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64537 18.3024 1.55274 18.6453 1.55177 18.9945C1.55079 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23675 20.5467 2.53773 20.7239C2.83871 20.9011 3.18082 20.9961 3.53 21H20.47C20.8192 20.9961 21.1613 20.9011 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.4492 19.3437 22.4482 18.9945C22.4473 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${person.delito}</span>
          </div>
          <div class="wanted-detail">
            <svg class="wanted-detail-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M3 10H21M8 2V6M16 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>${person.fechaRequisitoria}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  private displayResult(result: DetectionResult): void {
    if (!result.faceDetected) {
      this.resultContent.innerHTML = `
        <div class="result-alert result-alert-danger">
          <svg class="result-alert-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64537 18.3024 1.55274 18.6453 1.55177 18.9945C1.55079 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23675 20.5467 2.53773 20.7239C2.83871 20.9011 3.18082 20.9961 3.53 21H20.47C20.8192 20.9961 21.1613 20.9011 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.4492 19.3437 22.4482 18.9945C22.4473 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div>
            <div class="result-alert-title">NO SE DETECTÓ ROSTRO</div>
            <div class="result-alert-subtitle">Por favor, asegúrate de que tu rostro sea visible</div>
          </div>
        </div>
      `;
    } else if (result.isRequisitoriado && result.faceName) {
      this.resultContent.innerHTML = `
        <div class="result-alert result-alert-success">
          <svg class="result-alert-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div>
            <div class="result-alert-title">ROSTRO RECONOCIDO ✅</div>
            <div class="result-alert-subtitle">Confianza: ${result.confidence.toFixed(1)}%</div>
          </div>
        </div>

        <div class="result-details">
          <div class="detail-row">
            <span class="detail-label">Persona Identificada:</span>
            <span class="detail-value">${result.faceName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Modelo:</span>
            <span class="detail-value" style="color: #10b981; font-weight: 600;">Facenet512 (Python/DeepFace)</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Timestamp:</span>
            <span class="detail-value">${new Date().toLocaleString('es-PE')}</span>
          </div>
        </div>
      `;
    } else {
      this.resultContent.innerHTML = `
        <div class="result-alert result-alert-success">
          <svg class="result-alert-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div>
            <div class="result-alert-title">ROSTRO NO RECONOCIDO</div>
            <div class="result-alert-subtitle">Confianza: ${result.confidence.toFixed(1)}%</div>
          </div>
        </div>

        <div class="result-message">
          <p>El rostro detectado no coincide con ningún rostro entrenado en el sistema.</p>
          <p class="result-timestamp">Escaneo realizado: ${new Date().toLocaleString('es-PE')}</p>
        </div>
      `;
    }

    this.resultCard.classList.remove('hidden');
  }

  private hideResult(): void {
    this.resultCard.classList.add('hidden');
  }

  private updateStats(): void {
    document.getElementById('scanCount')!.textContent = this.scanCount.toString();
    document.getElementById('matchCount')!.textContent = this.matchCount.toString();
    document.getElementById('clearCount')!.textContent = this.clearCount.toString();
  }

  private showScanningAnimation(): void {
    const overlay = document.getElementById('detection-overlay') as HTMLElement;
    overlay.innerHTML = '<div class="scanning-line"></div>';

    setTimeout(() => {
      overlay.innerHTML = '';
    }, 2500);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new WebcamDetector();
});
