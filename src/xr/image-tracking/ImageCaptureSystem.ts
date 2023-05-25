import { ComponentType, Component, System } from "augmented-worlds";
import { WebXRSystem, WebXRFeatureSystem } from "../";
import { WebXRDomOverlay } from "@babylonjs/core/XR/features/WebXRDOMOverlay";
import { WebXRHitTest } from "@babylonjs/core/XR/features/WebXRHitTest";
import { WebXRSessionManager } from "@babylonjs/core/XR/webXRSessionManager";
import { Vector3 } from "@babylonjs/core/Maths/math";

/*
 * ImageCaptureSystem
 *
 * - Creates an overlay to capture an image target
 */
export class ImageCaptureSystem implements System, WebXRFeatureSystem {
  #sessionManager?: WebXRSessionManager;
  #hitTestSource?: XRHitTestSource;
  #isLoadingHitTestSource: boolean = false;

  constructor(
    private webXRSystem: WebXRSystem,
    private domOverlayElement: HTMLElement
  ) {
    webXRSystem.addFeatureSystem(this);
  }

  async initializeFeature() {
    const featuresManager = await this.webXRSystem.getXRFeaturesManager();

    this.domOverlayElement.style.display = "flex";
    this.domOverlayElement.style.flexDirection = "column-reverse";
    this.domOverlayElement.style.paddingBottom = "50px";
    this.domOverlayElement.style.alignItems = "center";

    // Capture image button
    const button = document.createElement("button");
    button.id = "scanner-button";
    button.style.boxSizing = "border-box";
    button.style.width = "75px";
    button.style.height = "75px";
    button.style.background = "#ffffff";
    button.style.border = "5px solid #707179";
    button.style.borderRadius = "50%";
    button.disabled = true;
    button.style.opacity = "0.5";

    button.ontouchstart = () => {
      if (!button.disabled) {
        button.style.opacity = "0.5";
      }
    };
    button.ontouchend = () => {
      if (!button.disabled) {
        button.style.opacity = "1";
      }
    };

    // Create coaching text
    const title = document.createElement("p");
    title.innerText = "Capture an image anchor within the bounding box.";
    title.style.color = "white";
    title.style.marginLeft = "20px";
    title.style.marginRight = "20px";
    title.style.textAlign = "center";
    title.style.fontSize = "2em";

    const subtitle = document.createElement("p");
    subtitle.innerText =
      "Currently supports horizontal planes only. AR content will be placed on top of the target. Try using a book on your coffee table, a coaster, etc. ";
    subtitle.style.color = "white";
    subtitle.style.marginLeft = "20px";
    subtitle.style.marginRight = "20px";
    subtitle.style.textAlign = "center";
    subtitle.style.fontSize = "1em";

    // Scanning overlay
    const scanner = document.createElement("div");
    scanner.id = "scanner-overlay";
    scanner.style.width = "75%";
    scanner.style.height = "25%";
    scanner.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
    scanner.style.border = "5px solid red";

    const scannerText = document.createElement("p");
    scannerText.id = "scanner-text";
    scannerText.style.color = "white";
    scannerText.style.fontSize = "1.5em";
    scannerText.innerText = "No Plane Detected";

    this.domOverlayElement.appendChild(button);
    this.domOverlayElement.appendChild(subtitle);
    this.domOverlayElement.appendChild(title);
    this.domOverlayElement.appendChild(scannerText);
    this.domOverlayElement.appendChild(scanner);

    // Enable DOMOverlay feature
    featuresManager.enableFeature(WebXRDomOverlay, "latest", {
      element: this.domOverlayElement,
    }) as WebXRDomOverlay;

    // Enable Hit Test feature
    featuresManager.enableFeature(WebXRHitTest, "latest") as WebXRHitTest;

    this.#sessionManager = await this.webXRSystem.getXRSessionManager();
  }

  update(
    _getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined,
    _getComponents: (componentType: ComponentType) => number[] | undefined
  ): void {
    if (!this.#sessionManager) return;

    // Request hit test source if not found
    if (
      !this.#hitTestSource &&
      !this.#isLoadingHitTestSource &&
      this.#sessionManager.session?.requestHitTestSource
    ) {
      this.#isLoadingHitTestSource = true;
      this.#sessionManager.session
        .requestHitTestSource({
          space: this.#sessionManager.viewerReferenceSpace,
        })
        .then((hitTestSource) => {
          this.#hitTestSource = hitTestSource;
        });
    }

    if (!this.#hitTestSource) return;

    const frame = this.#sessionManager.currentFrame;
    if (!frame || !frame.getHitTestResults) return;

    const hitTestResults: XRHitTestResult[] = frame.getHitTestResults(
      this.#hitTestSource
    );

    const viewerPose = frame.getViewerPose(this.#sessionManager.referenceSpace);
    if (!viewerPose) return;

    const hitTestPose =
      hitTestResults.length > 0
        ? hitTestResults[0].getPose(this.#sessionManager.referenceSpace)
        : null;

    if (hitTestPose) {
      const hitTestPosition = new Vector3(
        hitTestPose.transform.position.x,
        hitTestPose.transform.position.y,
        hitTestPose.transform.position.z
      );
      const viewerPosition = new Vector3(
        viewerPose.transform.position.x,
        viewerPose.transform.position.y,
        viewerPose.transform.position.z
      );

      const distance = Vector3.Distance(viewerPosition, hitTestPosition);

      const vFOV = this.#sessionManager.scene.cameras[0].fov;
      const height = 2 * Math.tan(vFOV / 2) * distance * 0.25; // visible height
      const width =
        height *
        this.#sessionManager.scene
          .getEngine()
          .getAspectRatio(this.#sessionManager.scene.cameras[0]) *
        (0.75 / 0.25);
      document.getElementById("scanner-overlay")!.style.border =
        "solid 5px green";
      document.getElementById("scanner-text")!.innerText = `${width.toFixed(
        3
      )}m`;

      if (
        (document.getElementById("scanner-button") as HTMLButtonElement)
          .disabled
      ) {
        document.getElementById("scanner-button")!.style.opacity = "1.0";
      }

      document.getElementById("scanner-button")!.removeAttribute("disabled");
    }
  }
}
