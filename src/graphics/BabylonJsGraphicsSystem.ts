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
  isLoadingModel?: boolean;
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

  constructor(
    private world: World,
    canvas: HTMLCanvasElement,
    private ipfsGatewayHost: string
  ) {
    canvas.setAttribute("hidden", "true");

    // Setup BabylonJS engine and scene
    const engine = new Engine(canvas, true);
    this.#engine = engine;
    this.#scene = new Scene(this.#engine);
    this.#scene.useRightHandedSystem = true;

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
    this.#engine.resize();
  }

  update(
    getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined,
    getComponents: (componentType: ComponentType) => number[] | undefined
  ): void {
    // Render meshes
    getComponents(ComponentType.GLTFModel)?.map((entityId) => {
      const component = getComponent(ComponentType.Component, entityId);
      const mesh = component as BabylonJsMesh;
      const model = getComponent(
        ComponentType.GLTFModel,
        entityId
      )! as GLTFModel;
      const position = getComponent(ComponentType.Position, entityId) as
        | Position
        | undefined;
      const orientation = getComponent(ComponentType.Orientation, entityId) as
        | Orientation
        | undefined;
      const scale = getComponent(ComponentType.Scale, entityId) as
        | Scale
        | undefined;

      // Load model if needed
      if (!mesh.isLoadingModel && !mesh.mesh) {
        mesh.isLoadingModel = true;

        Tools.LoadFileAsync(
          `${this.ipfsGatewayHost}/ipfs/${model.glTFModel}`,
          true
        )
          .then((assetArrayBuffer) => {
            const assetBlob = new Blob([assetArrayBuffer]);
            const assetUrl = URL.createObjectURL(assetBlob);
            return SceneLoader.LoadAssetContainerAsync(
              assetUrl,
              undefined,
              this.#scene,
              undefined,
              ".glb"
            );
          })
          .then((container) => {
            const rootMesh = container.createRootMesh();
            console.debug("Loaded mesh: " + mesh);

            mesh.mesh = rootMesh;

            this.#scene.addMesh(rootMesh, true);
            mesh.isLoadingModel = false;
          });
      }

      if (mesh.mesh) {
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
