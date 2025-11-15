import {
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  UniversalCamera,
  VirtualJoysticksCamera,
  Vector3,
  AbstractMesh,
  StandardMaterial,
  Color3,
  Ray,
} from 'babylonjs';
import 'babylonjs-loaders';

export class Game {
  private engine: Engine;
  private scene: Scene;
  private projectileBase: AbstractMesh | null = null;
  private camera: UniversalCamera | VirtualJoysticksCamera | null = null;
  // --- Procedural Chunked Ground ---
  private readonly chunkSize = 20;
  private readonly chunkRange = 2; // Quantos chunks para cada lado do jogador
  private loadedChunks = new Map<string, AbstractMesh>();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    window.addEventListener('resize', () => this.engine.resize());
  }

  public start(): void {
    this.createScene();
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  private createScene(): void {
    const isTouchDevice = ((): boolean => {
      return (
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
        'ontouchstart' in window ||
        /Mobi|Android|iPhone|iPad|iPod|Tablet|PlayBook|Silk|Opera Mini/i.test(navigator.userAgent)
      );
    })();

    let camera: UniversalCamera | VirtualJoysticksCamera;

    if (isTouchDevice) {
      camera = new VirtualJoysticksCamera('camera', new Vector3(0, 1.8, -5), this.scene);
    } else {
      camera = new UniversalCamera('camera', new Vector3(0, 1.8, -5), this.scene);
      camera.keysUp = [87, 38]; // W + ArrowUp
      camera.keysDown = [83, 40]; // S + ArrowDown
      camera.keysLeft = [65, 37]; // A + ArrowLeft
      camera.keysRight = [68, 39]; // D + ArrowRight
    }

    camera.checkCollisions = true;
    camera.applyGravity = true;
    camera.ellipsoid = new Vector3(0.5, 0.9, 0.5);
    camera.speed = 0.5;
    camera.setTarget(Vector3.Zero());
    camera.attachControl(this.canvas, true);
    this.camera = camera;

    // Simple gun model attached to camera (first-person)
    const gun = MeshBuilder.CreateBox('gun', { width: 0.12, height: 0.08, depth: 0.4 }, this.scene);
    gun.parent = camera;
    gun.position = new Vector3(0.25, -0.18, 0.6);
    gun.rotation = new Vector3(0.05, 0.3, 0);
    gun.isPickable = false;
    gun.checkCollisions = false;
    const gunMat = new StandardMaterial('gunMat', this.scene);
    gunMat.diffuseColor = new Color3(0.15, 0.15, 0.18);
    gun.material = gunMat;

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.8;


    // Cria a esfera base do projétil (invisível, usada como modelo)
    this.projectileBase = MeshBuilder.CreateSphere('projectileBase', { diameter: 0.2 }, this.scene);
    this.projectileBase.isVisible = false;

    this.scene.gravity = new Vector3(0, -0.9, 0);
    this.scene.collisionsEnabled = true;

    // Eventos de disparo
    this.setupShootEvents();

    // Inicializa o chão procedural e colisões do terreno
    this.initProceduralGround();

    // Mobile HUD buttons (only on touch devices)
    this.setupMobileButtons(isTouchDevice);
  }

  // Inicializa o chão procedural e atualiza conforme o jogador se move
  private initProceduralGround(): void {
    this.updateChunks();
    this.scene.onBeforeRenderObservable.add(() => {
      this.updateChunks();
    });
  }

  // Gera uma chave única para cada chunk
  private getChunkKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  // Atualiza os chunks carregados de acordo com a posição do jogador
  private updateChunks(): void {
    if (!this.camera) return;
    const camPos = this.camera.position;
    const playerChunkX = Math.floor(camPos.x / this.chunkSize);
    const playerChunkZ = Math.floor(camPos.z / this.chunkSize);

    const needed = new Set<string>();
    for (let dx = -this.chunkRange; dx <= this.chunkRange; dx++) {
      for (let dz = -this.chunkRange; dz <= this.chunkRange; dz++) {
        const cx = playerChunkX + dx;
        const cz = playerChunkZ + dz;
        const key = this.getChunkKey(cx, cz);
        needed.add(key);
        if (!this.loadedChunks.has(key)) {
          // Cria um chunk procedural
          const mesh = MeshBuilder.CreateGround(`ground_${key}`,
            { width: this.chunkSize, height: this.chunkSize, subdivisions: 2 },
            this.scene);
          mesh.position.x = cx * this.chunkSize;
          mesh.position.z = cz * this.chunkSize;
          mesh.checkCollisions = true;
          // Material verde para o chão
          const mat = new StandardMaterial(`groundMat_${key}`, this.scene);
          mat.diffuseColor = new Color3(0.2 + Math.random() * 0.1, 0.7 + Math.random() * 0.2, 0.2 + Math.random() * 0.1);
          mesh.material = mat;
          // Exemplo de variação procedural: altura levemente ruidosa
          const vertices = mesh.getVerticesData("position");
          if (vertices) {
            for (let i = 0; i < vertices.length; i += 3) {
              // Pequena variação de altura (pode trocar por Perlin noise depois)
              vertices[i + 1] = Math.sin((vertices[i] + mesh.position.x) * 0.1) * 0.2 +
                               Math.cos((vertices[i + 2] + mesh.position.z) * 0.1) * 0.2;
            }
            mesh.updateVerticesData("position", vertices);
          }
          this.loadedChunks.set(key, mesh);
        }
      }
    }
    // Remove chunks que não são mais necessários
    for (const [key, mesh] of this.loadedChunks.entries()) {
      if (!needed.has(key)) {
        mesh.dispose();
        this.loadedChunks.delete(key);
      }
    }
  }

  private shoot(): void {
    if (!this.camera || !this.projectileBase) return;

    // Clona a esfera base corretamente (Mesh.clone espera 2-3 argumentos)
    const projectile = this.projectileBase.clone('projectile', null, true);
    if (!projectile) return;
    projectile.isVisible = true;
    projectile.isPickable = false;
    projectile.checkCollisions = false;

    // Posição inicial: um pouco à frente da câmera
    const cam = this.camera;
    const forward = cam.getDirection(new Vector3(0, 0, 1));
    projectile.position = cam.position.add(forward.scale(0.8));

    // Velocidade inicial (impulso)
    const velocity = forward.scale(0.6);

    // Atualização manual do movimento (sem física avançada)
    let alive = true;
    const update = () => {
      if (!alive) return;
      projectile.position.addInPlace(velocity);
      // Remove se sair do mapa
      if (projectile.position.length() > 100) {
        projectile.dispose();
        alive = false;
      }
    };
    this.scene.onBeforeRenderObservable.add(update);
    // Remove do observable ao destruir
    projectile.onDisposeObservable.add(() => {
      alive = false;
      this.scene.onBeforeRenderObservable.removeCallback(update);
    });
  }

  private setupShootEvents(): void {
    // Mouse (desktop)
    this.canvas.addEventListener('pointerdown', (e) => {
      // Só dispara com botão esquerdo
      if (e.pointerType === 'mouse' && e.button === 0) {
        this.shoot();
      }
      // Toque: só dispara se for no lado direito da tela
      if (e.pointerType === 'touch') {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x > rect.width / 2) {
          this.shoot();
        }
      }
    });

    // Teclado: pular com espaço
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.jump();
      }
      // Atalho: clique com Enter para teste
      if (e.code === 'Enter') {
        this.shoot();
      }
    });
  }

  private setupMobileButtons(isTouchDevice: boolean): void {
    if (!isTouchDevice) return;
    // Create buttons only once
    const existingFire = document.getElementById('bb-fire-btn');
    const existingJump = document.getElementById('bb-jump-btn');
    if (existingFire || existingJump) return;

    const mkBtn = (id: string, label: string, className: string, onDown: () => void) => {
      const btn = document.createElement('button');
      btn.id = id;
      btn.className = `hud-btn ${className}`;
      btn.innerText = label;
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); onDown(); });
      // Prevent losing pointer lock etc.
      btn.addEventListener('pointerup', (e) => e.preventDefault());
      document.body.appendChild(btn);
      return btn;
    };

    mkBtn('bb-fire-btn', 'FIRE', 'fire-btn', () => this.shoot());
    mkBtn('bb-jump-btn', 'JUMP', 'jump-btn', () => this.jump());
  }

  private jump(): void {
    if (!this.camera) return;
    // Only jump if grounded
    if (!this.isGrounded()) return;
    // Apply upward impulse using cameraDirection
    (this.camera as any).cameraDirection = (this.camera as any).cameraDirection || new Vector3();
    (this.camera as any).cameraDirection.y += 0.35; // tweak for feel
  }

  private isGrounded(): boolean {
    if (!this.camera) return false;
    const origin = this.camera.position.clone();
    const ray = new Ray(origin, new Vector3(0, -1, 0), 1.2);
    const pick = this.scene.pickWithRay(ray, (m) => m.checkCollisions === true);
    return !!(pick && pick.hit && pick.distance !== undefined && pick.distance < 1.0);
  }
}
