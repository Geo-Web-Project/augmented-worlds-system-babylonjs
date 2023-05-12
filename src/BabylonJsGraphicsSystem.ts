import { ComponentType, Component, System } from "augmented-worlds";
import { World } from "augmented-worlds";

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

// Side-effects only imports allowing the standard material to be used as default.
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Animations/animatable";
import "@babylonjs/core/Materials/Node/Blocks";

/*
 * BabylonJsGraphicsSystem
 *
 * - Creates a BabylonJs engine, scene, camera, and light
 * - Binds render loop to World
 * - TODO: Render models
 */
export class BabylonJsGraphicsSystem implements System {
  #engine: Engine;
  #scene: Scene;

  constructor(private world: World, canvas: HTMLCanvasElement) {
    canvas.setAttribute("hidden", "true");

    // Setup BabylonJS engine and scene
    const engine = new Engine(canvas, true);
    this.#engine = engine;
    this.#scene = new Scene(this.#engine);

    // Setup camera and light
    let camera = new FreeCamera("camera1", new Vector3(0, 5, -10), this.#scene);
    camera.setTarget(Vector3.Zero());
    camera.attachControl(this.#engine.getRenderingCanvas(), true);
    let light = new HemisphericLight(
      "light1",
      new Vector3(0, 1, 0),
      this.#scene
    );
    light.intensity = 0.7;

    // Watch for browser/canvas resize events
    window.addEventListener("resize", () => {
      engine.resize();
    });
  }

  getScene(): Scene {
    return this.#scene;
  }

  start() {
    // Bind render loop to World
    this.#engine.runRenderLoop(() => {
      this.world.update();
    });

    this.#engine.getRenderingCanvas()?.removeAttribute("hidden");
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
