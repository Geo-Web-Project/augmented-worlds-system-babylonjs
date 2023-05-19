import {
  ComponentType,
  Component,
  System,
  Position,
  Orientation,
  TrackedImage,
} from "augmented-worlds";
import { WebXRSystem, WebXRFeatureSystem } from "../";
import { WebXRImageTracking } from "@babylonjs/core/XR/features/WebXRImageTracking";
import { Tools } from "@babylonjs/core/Misc/tools";
import { WebXRSessionManager } from "@babylonjs/core/XR/webXRSessionManager";

interface WebXRImageTarget extends Component {
  isLoadingImage?: boolean;
  imageBitmap?: ImageBitmap;
}

type WebXRImageConfig = {
  src: ImageBitmap;
  estimatedRealWorldWidth: number;
  entityId: number;
};

/*
 * ImageTrackingSystem
 *
 * - Detects images and updates their local transform
 */
export class ImageTrackingSystem implements System, WebXRFeatureSystem {
  #sessionManager?: WebXRSessionManager;
  #loadingImages: Promise<WebXRImageConfig>[] = [];
  #imageIds: Record<number, number> = {};

  constructor(
    private webXRSystem: WebXRSystem,
    private ipfsGatewayHost: string
  ) {
    webXRSystem.addFeatureSystem(this);
  }

  async initializeFeature() {
    const featuresManager = await this.webXRSystem.getXRFeaturesManager();

    // Load images
    const images = await Promise.all(this.#loadingImages);
    for (let i = 0; i < images.length; i++) {
      this.#imageIds[images[i].entityId] = i;
    }

    // Enable Image Tracking feature
    featuresManager.enableFeature(WebXRImageTracking, "latest", {
      images,
    }) as WebXRImageTracking;

    this.#sessionManager = await this.webXRSystem.getXRSessionManager();
  }

  update(
    getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined,
    getComponents: (componentType: ComponentType) => number[] | undefined
  ): void {
    getComponents(ComponentType.TrackedImage)?.map((entityId) => {
      const component = getComponent(ComponentType.Component, entityId);
      const imageTarget = component as WebXRImageTarget;
      const trackedImage = getComponent(
        ComponentType.TrackedImage,
        entityId
      )! as TrackedImage;
      const positionCom = getComponent(ComponentType.Position, entityId) as
        | Position
        | undefined;
      const orientationCom = getComponent(
        ComponentType.Orientation,
        entityId
      ) as Orientation | undefined;

      // Load image if needed
      if (!imageTarget.isLoadingImage && !imageTarget.imageBitmap) {
        imageTarget.isLoadingImage = true;

        const imageP = Tools.LoadFileAsync(
          `${this.ipfsGatewayHost}/ipfs/${trackedImage.imageAsset["/"]}`,
          true
        )
          .then((assetArrayBuffer) => {
            const assetBlob = new Blob([assetArrayBuffer]);
            return createImageBitmap(assetBlob);
          })
          .then((imageBitmap) => {
            return {
              src: imageBitmap,
              estimatedRealWorldWidth: trackedImage.physicalWidthInMeters,
              entityId,
            };
          });

        this.#loadingImages.push(imageP);
      }

      // Update transform
      if (!this.#sessionManager) return;

      const frame = this.#sessionManager.currentFrame;
      if (!frame || !frame.getImageTrackingResults) return;

      const trackingResult = frame
        .getImageTrackingResults()
        .find((v) => v.index === this.#imageIds[entityId]);

      if (!trackingResult) return;

      const pose = frame.getPose(
        trackingResult.imageSpace,
        this.#sessionManager.referenceSpace
      );
      const state = trackingResult.trackingState;

      if (!pose) {
        if (positionCom) {
          positionCom.position = undefined;
        }
        if (orientationCom) {
          orientationCom.orientation = undefined;
        }
        return;
      }

      if (state == "tracked" || state == "emulated") {
        // TODO: Handle if position component does not exist?
        if (positionCom) {
          positionCom.position = {
            x: pose.transform.position.x,
            y: pose.transform.position.y,
            z: pose.transform.position.z,
          };
        }

        // TODO: Handle if orientation component does not exist?
        if (orientationCom) {
          orientationCom.orientation = {
            x: pose.transform.orientation.x,
            y: pose.transform.orientation.y,
            z: pose.transform.orientation.z,
            w: pose.transform.orientation.w,
          };
        }
      }
    });
  }
}
