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

export interface BabylonJsMesh extends Component {
  isLoadingModel?: boolean;
  mesh?: Mesh;
  isVisible?: boolean;
}

/*
 * GraphicsSystem
 *
 * - Creates a BabylonJs engine, scene, camera, and light
 * - Binds render loop to World
 * - TODO: Render models
 */
export class GraphicsSystem implements System {
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
  }

  getScene(): Scene {
    return this.#scene;
  }

  start() {
    // Perform a single update first
    this.world.update();

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
          `${this.ipfsGatewayHost}/ipfs/${model.glTFModel["/"]}`,
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
            mesh.isLoadingModel = false;
            mesh.isVisible = true;
          });
      }

      if (mesh.mesh) {
        // console.log(mesh.isVisible);
        const isMeshInScene = this.#scene.getMeshById(mesh.mesh.id) !== null;
        // console.log(isMeshInScene);
        if (mesh.isVisible === true && !isMeshInScene) {
          this.#scene.addMesh(mesh.mesh, true);
          console.debug("Added mesh to scene: " + mesh);
        } else if (mesh.isVisible === false && isMeshInScene) {
          this.#scene.removeMesh(mesh.mesh, true);
          console.debug("Removed mesh from scene: " + mesh);
        }

        if (position) {
          mesh.mesh.position = new Vector3(
            position.position?.x ?? position.startPosition?.x ?? 0,
            position.position?.y ?? position.startPosition?.y ?? 0,
            position.position?.z ?? position.startPosition?.z ?? 0
          );
        } else {
          mesh.mesh.position = new Vector3(0, 0, 0);
        }

        if (orientation) {
          mesh.mesh.rotationQuaternion = new Quaternion(
            orientation.orientation?.x ?? orientation.startOrientation?.x ?? 0,
            orientation.orientation?.y ?? orientation.startOrientation?.y ?? 0,
            orientation.orientation?.z ?? orientation.startOrientation?.z ?? 0,
            orientation.orientation?.w ?? orientation.startOrientation?.w ?? 1
          );
        } else {
          mesh.mesh.rotationQuaternion = new Quaternion(0, 0, 0, 1);
        }

        if (scale) {
          mesh.mesh.scaling = new Vector3(
            scale.scale?.x ?? scale.startScale?.x ?? 0,
            scale.scale?.y ?? scale.startScale?.y ?? 0,
            scale.scale?.z ?? scale.startScale?.z ?? 0
          );
        } else {
          mesh.mesh.scaling = new Vector3(1, 1, 1);
        }
      }
    });
    this.#scene.render();
  }
}
