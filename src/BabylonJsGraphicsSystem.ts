import {
  World,
  ComponentType,
  Component,
  System,
  GLTFModel,
  Position,
  Orientation,
  Scale,
} from "augmented-worlds";

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Tools } from "@babylonjs/core/Misc/tools";
// import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

// Side-effects only imports allowing the standard material to be used as default.
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Meshes/Builders/groundBuilder";
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Animations/animatable";
import "@babylonjs/core/Materials/Node/Blocks";
import "@babylonjs/core/assetContainer";

interface BabylonJsMesh extends Component {
  mesh?: Mesh;
}

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

  #initialLoad: boolean = true;

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

    // var sphere = MeshBuilder.CreateSphere(
    //   "sphere1",
    //   { segments: 16, diameter: 2 },
    //   this.#scene
    // );
    // sphere.position.y = 2;
    // sphere.position.z = 5;

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
    this.#engine.resize();
  }

  update(
    getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined,
    getComponents: (componentType: ComponentType) => number[] | undefined
  ): void {
    if (this.#initialLoad) {
      this.#initialLoad = false;

      // Load GLTFModel
      getComponents(ComponentType.GLTFModel)?.map(async (entityId) => {
        const model = getComponent(
          ComponentType.GLTFModel,
          entityId
        )! as GLTFModel;
        const component = getComponent(ComponentType.Component, entityId);
        const assetArrayBuffer = await Tools.LoadFileAsync(
          `https://w3s.link/ipfs/${model.glTFModel}`,
          true
        );

        const assetBlob = new Blob([assetArrayBuffer]);
        const assetUrl = URL.createObjectURL(assetBlob);
        const container = await SceneLoader.LoadAssetContainerAsync(
          assetUrl,
          undefined,
          this.#scene,
          undefined,
          ".glb"
        );

        const mesh = container.createRootMesh();

        // Save mesh to component
        if (component) {
          (component as BabylonJsMesh).mesh = mesh;
        } else {
          this.world.add_component_to_entity(
            entityId,
            ComponentType.Component,
            { mesh }
          );
        }

        this.#scene.addMesh(mesh, true);
      });
    }

    // Render meshes
    getComponents(ComponentType.GLTFModel)?.map(async (entityId) => {
      const mesh = getComponent(ComponentType.Component, entityId) as
        | BabylonJsMesh
        | undefined;
      const position = getComponent(ComponentType.Position, entityId) as
        | Position
        | undefined;
      const orientation = getComponent(ComponentType.Orientation, entityId) as
        | Orientation
        | undefined;
      const scale = getComponent(ComponentType.Scale, entityId) as
        | Scale
        | undefined;

      if (mesh?.mesh) {
        if (position) {
          mesh.mesh.position = new Vector3(
            (position.position ?? position.startPosition).x,
            (position.position ?? position.startPosition).y,
            (position.position ?? position.startPosition).z
          );
        } else {
          mesh.mesh.position = new Vector3(0, 0, 0);
        }

        if (orientation) {
          mesh.mesh.rotationQuaternion = new Quaternion(
            (orientation.orientation ?? orientation.startOrientation).x,
            (orientation.orientation ?? orientation.startOrientation).y,
            (orientation.orientation ?? orientation.startOrientation).z,
            (orientation.orientation ?? orientation.startOrientation).w
          );
        } else {
          mesh.mesh.rotationQuaternion = new Quaternion(0, 0, 0, 1);
        }

        if (scale) {
          mesh.mesh.scaling = new Vector3(
            (scale.scale ?? scale.startScale).x,
            (scale.scale ?? scale.startScale).y,
            (scale.scale ?? scale.startScale).z
          );
        } else {
          mesh.mesh.scaling = new Vector3(1, 1, 1);
        }
      }
    });
    this.#scene.render();
  }
}
