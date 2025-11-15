import {
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  UniversalCamera,
  VirtualJoysticksCamera,
  Vector3,
} from 'babylonjs';
import 'babylonjs-loaders';

export class Game {
  private engine: Engine;
  private scene: Scene;

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

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.8;

    const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, this.scene);
    ground.checkCollisions = true;

    this.scene.gravity = new Vector3(0, -0.9, 0);
    this.scene.collisionsEnabled = true;
  }
}
