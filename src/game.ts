import {
  ArcRotateCamera,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
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
    const camera = new ArcRotateCamera('camera', Math.PI / 2, Math.PI / 3, 10, Vector3.Zero(), this.scene);
    camera.attachControl(this.canvas, true);

    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.8;

    MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, this.scene);
    MeshBuilder.CreateBox('player', { size: 1 }, this.scene).position.y = 0.5;
  }
}
