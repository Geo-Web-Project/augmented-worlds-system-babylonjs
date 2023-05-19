import { ComponentType, Component, System } from "augmented-worlds";

import { Scene } from "@babylonjs/core/scene";
import { WebXRExperienceHelper } from "@babylonjs/core/XR/webXRExperienceHelper";
import { WebXRSessionManager } from "@babylonjs/core/XR/webXRSessionManager";
import { WebXRFeaturesManager } from "@babylonjs/core/XR/webXRFeaturesManager";

// import { Tools } from "@babylonjs/core/Misc/tools";
// import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

// Side-effects only imports allowing the standard material to be used as default.
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Animations/animatable";
import "@babylonjs/core/Materials/Node/Blocks";

export interface WebXRFeatureSystem {
  initializeFeature(): Promise<void>;
}

/*
 * BabylonJsWebXRSystem
 *
 * - Attaches a WebXR session to a BabylonJS Scene
 * - Does nothing in the update loop
 */
export class WebXRSystem implements System {
  #scene: Scene;
  #xrHelperP: Promise<WebXRExperienceHelper>;
  #featureSystems: WebXRFeatureSystem[] = [];

  constructor(scene: Scene) {
    this.#scene = scene;

    // Setup XR
    this.#xrHelperP = WebXRExperienceHelper.CreateAsync(this.#scene);
  }

  addFeatureSystem(featureSystem: WebXRFeatureSystem) {
    this.#featureSystems.push(featureSystem);
  }

  async startXRSession() {
    const xrHelper = await this.#xrHelperP;

    for (const featureSystem of this.#featureSystems) {
      await featureSystem.initializeFeature();
    }

    await xrHelper.enterXRAsync("immersive-ar", "local", undefined, {
      requiredFeatures: ["local"],
    });
  }

  async getXRSessionManager(): Promise<WebXRSessionManager> {
    const xrHelper = await this.#xrHelperP;
    return xrHelper.sessionManager;
  }

  async getXRFeaturesManager(): Promise<WebXRFeaturesManager> {
    const xrHelper = await this.#xrHelperP;
    return xrHelper.featuresManager;
  }

  update(
    _getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined
  ): void {}
}
