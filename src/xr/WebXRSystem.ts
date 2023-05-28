import { ComponentType, Component, System } from "augmented-worlds";

import { Scene } from "@babylonjs/core/scene";
import {
  WebXRExperienceHelper,
  WebXRSessionManager,
  WebXRFeaturesManager,
} from "@babylonjs/core";

// import { Tools } from "@babylonjs/core/Misc/tools";
// import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

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

  static async isSupported(): Promise<boolean> {
    return WebXRSessionManager.IsSessionSupportedAsync("immersive-ar");
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
