import { ComponentType, Component, System } from "augmented-worlds";
import { World } from "augmented-worlds";

import * as BABYLON from "@babylonjs/core/Legacy/legacy";

export class BabylonJsGraphicsSystem implements System {
  #scene: BABYLON.Scene;

  constructor(private world: World, canvas: HTMLCanvasElement) {
    const engine = new BABYLON.Engine(canvas, true);
    this.#scene = new BABYLON.Scene(engine);

    const camera = new BABYLON.FreeCamera(
      "camera1",
      new BABYLON.Vector3(0, 5, -10),
      this.#scene
    );
    // Targets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());
    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);
    // Creates a light, aiming 0,1,0 - to the sky
    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(0, 1, 0),
      this.#scene
    );
    // Dim the light a small amount - 0 to 1
    light.intensity = 0.7;
    // Built-in 'sphere' shape.
    const sphere = BABYLON.MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 2, segments: 32 },
      this.#scene
    );
    // Move the sphere upward 1/2 its height
    sphere.position.y = 1;
    // Built-in 'ground' shape.
    BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 6, height: 6 },
      this.#scene
    );

    engine.runRenderLoop(() => {
      this.world.update();
    });

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
      engine.resize();
    });
  }

  update(
    _getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined
  ): void {
    this.#scene.render();
  }
}
