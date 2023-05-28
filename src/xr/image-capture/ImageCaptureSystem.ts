import { ComponentType, Component, System } from "augmented-worlds";
import { WebXRSystem, WebXRFeatureSystem } from "../";
import {
  WebXRDomOverlay,
  WebXRHitTest,
  WebXRSessionManager,
  Vector3,
  WebXRAbstractFeature,
  WebXRFeaturesManager,
  Observable,
} from "@babylonjs/core";
import { base64 } from "multiformats/bases/base64";

class WebXRCameraAccessFeature extends WebXRAbstractFeature {
  static readonly Name = "xr-camera-access";
  static readonly Version = 1;

  constructor(_xrSessionManager: WebXRSessionManager) {
    super(_xrSessionManager);

    this.xrNativeFeatureName = "camera-access";
  }

  _onXRFrame(_frame: XRFrame) {}
}

export type ImageAnchorCapture = {
  imageBytes: Uint8Array;
  physicalWidth: number;
};

/*
 * ImageCaptureSystem
 *
 * - Creates an overlay to capture an image target
 */
export class ImageCaptureSystem implements System, WebXRFeatureSystem {
  #sessionManager?: WebXRSessionManager;
  #hitTestSource?: XRHitTestSource;
  #isLoadingHitTestSource: boolean = false;
  #isCapturingImage: boolean = false;

  onImageAnchorCaptured: Observable<ImageAnchorCapture>;

  static NO_PLANE_FOUND_TEXT = "No Plane Detected";

  constructor(
    private webXRSystem: WebXRSystem,
    private domOverlayElement: HTMLElement
  ) {
    webXRSystem.addFeatureSystem(this);

    this.onImageAnchorCaptured = new Observable();
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
    button.onclick = () => {
      this._captureImage();
    };

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
      "The system works by detecting and measuring flat planes. Try using a book on your coffee table or a picture hanging on your wall.";
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
    scannerText.innerText = ImageCaptureSystem.NO_PLANE_FOUND_TEXT;

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

    // Enable custom Camera Access feature
    WebXRFeaturesManager.AddWebXRFeature(
      WebXRCameraAccessFeature.Name,
      (xrSessionManager) => {
        return () => new WebXRCameraAccessFeature(xrSessionManager);
      },
      1,
      false
    );
    featuresManager.enableFeature(WebXRCameraAccessFeature, "latest");

    this.#sessionManager = await this.webXRSystem.getXRSessionManager();
  }

  update(
    _getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined,
    _getComponents: (componentType: ComponentType) => number[] | undefined
  ): void {
    this.#sessionManager?.runInXRFrame(() => {
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
      if (!frame?.getHitTestResults) return;

      const width = this._calculateBoundingBoxWidth(frame);
      if (width) {
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
      } else {
        document.getElementById("scanner-overlay")!.style.border =
          "solid 5px red";
        document.getElementById("scanner-text")!.innerText =
          ImageCaptureSystem.NO_PLANE_FOUND_TEXT;
        document
          .getElementById("scanner-button")!
          .setAttribute("disabled", "true");
      }
    });
  }

  private _calculateBoundingBoxWidth(frame: XRFrame): number | undefined {
    if (!this.#hitTestSource || !this.#sessionManager) return;

    const hitTestResults: XRHitTestResult[] =
      frame.getHitTestResults(this.#hitTestSource) ?? [];

    const viewerPose = frame?.getViewerPose(
      this.#sessionManager.referenceSpace
    );
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
      return (
        height *
        this.#sessionManager.scene
          .getEngine()
          .getAspectRatio(this.#sessionManager.scene.cameras[0]) *
        (0.75 / 0.25)
      );
    } else {
      return;
    }
  }

  private _captureImage() {
    this.#sessionManager?.runInXRFrame(() => {
      if (!this.#sessionManager || this.#isCapturingImage) return;

      const frame = this.#sessionManager.currentFrame;
      if (!frame) return;

      const viewerPose = frame?.getViewerPose(
        this.#sessionManager.referenceSpace
      );
      const view =
        viewerPose && viewerPose.views.length > 0
          ? viewerPose.views[0]
          : undefined;

      if (!view) return;

      this.#isCapturingImage = true;

      const cam = (view as any).camera;

      const gl = this.#sessionManager.scene
        .getEngine()
        .getRenderingCanvas()
        ?.getContext("webgl2");
      if (!gl) return;

      const glBinding = new XRWebGLBinding(this.#sessionManager.session, gl);
      const cameraTexture: WebGLTexture = (glBinding as any).getCameraImage(
        cam
      );

      const prev_framebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        cameraTexture,
        0
      );

      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error("Error creating framebuffer:", status);
        return;
      }

      // Read the pixels from the framebuffer
      const pixels = new Uint8Array(cam.width * cam.height * 4);
      gl.readPixels(
        0,
        0,
        cam.width,
        cam.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      );
      gl.deleteFramebuffer(framebuffer);
      gl.bindFramebuffer(gl.FRAMEBUFFER, prev_framebuffer);

      // Draw the pixels to a 2D canvas

      const imageCanvas = document.createElement("canvas") as HTMLCanvasElement;
      imageCanvas.width = cam.width;
      imageCanvas.height = cam.height;
      const context = imageCanvas.getContext("2d");
      const imageData = context!.createImageData(cam.width, cam.height);
      imageData.data.set(pixels);
      context!.putImageData(imageData, 0, 0);

      // Flip image vertically
      context!.translate(0, cam.height);
      context!.scale(1, -1);
      context!.drawImage(imageCanvas, 0, 0);

      // Crop image proportional to the position and size of "scanner-overlay" in "scanner"
      const scannerOverlay = document.getElementById("scanner-overlay")!;
      const scannerOverlayRect = scannerOverlay.getBoundingClientRect();
      const scannerRect = this.domOverlayElement.getBoundingClientRect();
      const cropWidth =
        cam.width * (scannerOverlayRect.width / scannerRect.width);
      const cropHeight =
        cam.height * (scannerOverlayRect.height / scannerRect.height);
      const cropX = cam.width * (scannerOverlayRect.left / scannerRect.width);
      const cropY = cam.height * (scannerOverlayRect.top / scannerRect.height);
      const cropCanvas = document.createElement("canvas") as HTMLCanvasElement;
      cropCanvas.width = cropWidth;
      cropCanvas.height = cropHeight;
      const cropContext = cropCanvas.getContext("2d");
      cropContext!.drawImage(
        imageCanvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      document
        .getElementById("scanner-button")!
        .setAttribute("disabled", "true");

      const physicalWidth = this._calculateBoundingBoxWidth(frame);
      if (!physicalWidth) {
        console.warn("Could not calculate physical width of image");
        return;
      }

      const dataUrl = cropCanvas.toDataURL("image/png");

      // Convert dataUrl to base64 string
      const base64String = dataUrl.split(",")[1];
      // Decode base64 string
      const imageBytes = base64.baseDecode(base64String);
      this.onImageAnchorCaptured.notifyObservers({
        imageBytes,
        physicalWidth,
      });

      this.#isCapturingImage = true;
    });
  }
}
