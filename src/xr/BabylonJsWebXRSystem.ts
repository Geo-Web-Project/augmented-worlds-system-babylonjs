import { ComponentType, Component, System } from "augmented-worlds";

import { Scene } from "@babylonjs/core/scene";
import { WebXRExperienceHelper } from "@babylonjs/core/XR/webXRExperienceHelper";
import { WebXRSessionManager } from "@babylonjs/core/XR/webXRSessionManager";

// import { Tools } from "@babylonjs/core/Misc/tools";
// import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

// Side-effects only imports allowing the standard material to be used as default.
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Animations/animatable";
import "@babylonjs/core/Materials/Node/Blocks";

/*
 * BabylonJsWebXRSystem
 *
 * - Attaches a WebXR session to a BabylonJS Scene
 * - Does nothing in the update loop
 */
export class BabylonJsWebXRSystem implements System {
  #scene: Scene;
  #xrHelperP: Promise<WebXRExperienceHelper>;
  #sessionManager?: WebXRSessionManager;

  constructor(scene: Scene) {
    this.#scene = scene;

    // Setup XR
    this.#xrHelperP = WebXRExperienceHelper.CreateAsync(this.#scene);
  }

  async startXRSession() {
    const xrHelper = await this.#xrHelperP;

    // TODO: Allow for custom XR config
    this.#sessionManager = await xrHelper.enterXRAsync("immersive-ar", "local");
  }

  getXRSessionManager(): WebXRSessionManager | undefined {
    return this.#sessionManager;
  }

  update(
    _getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined
  ): void {}
}
