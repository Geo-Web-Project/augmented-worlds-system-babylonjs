import {
  ComponentType,
  Component,
  System,
  Position,
  Orientation,
} from "augmented-worlds";
import { WebXRSystem, WebXRFeatureSystem } from "../";
import {
  WebXRAnchorSystem,
  IWebXRAnchor,
} from "@babylonjs/core/XR/features/WebXRAnchorSystem";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math";
import { WebXRSessionManager } from "@babylonjs/core/XR/webXRSessionManager";

interface WebXRAnchor extends Component {
  isCreatingAnchor?: boolean;
  webXRAnchor?: IWebXRAnchor;
}

/*
 * AnchorSystem
 *
 * - Creates WebXR anchors for IsAnchor components
 */
export class AnchorSystem implements System, WebXRFeatureSystem {
  #anchorSystem?: WebXRAnchorSystem;
  #sessionManager?: WebXRSessionManager;

  constructor(private webXRSystem: WebXRSystem) {
    webXRSystem.addFeatureSystem(this);
  }

  async initializeFeature() {
    const featuresManager = await this.webXRSystem.getXRFeaturesManager();

    // Enable Anchors feature
    this.#anchorSystem = featuresManager.enableFeature(
      WebXRAnchorSystem,
      "latest"
    ) as WebXRAnchorSystem;

    this.#sessionManager = await this.webXRSystem.getXRSessionManager();
  }

  update(
    getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined,
    getComponents: (componentType: ComponentType) => number[] | undefined
  ): void {
    if (!this.#sessionManager) return;

    getComponents(ComponentType.IsAnchor)?.map((entityId) => {
      const component = getComponent(ComponentType.Component, entityId);
      const anchorCom = component as WebXRAnchor;
      const positionCom = getComponent(ComponentType.Position, entityId) as
        | Position
        | undefined;
      const orientationCom = getComponent(
        ComponentType.Orientation,
        entityId
      ) as Orientation | undefined;

      if (!positionCom?.startPosition) return;
      if (!orientationCom?.startOrientation) return;

      // Create anchor if does not exist
      if (!anchorCom.isCreatingAnchor && !anchorCom.webXRAnchor) {
        anchorCom.isCreatingAnchor = true;

        const position = new Vector3(
          positionCom?.position?.x ?? positionCom?.startPosition?.x ?? 0,
          positionCom?.position?.y ?? positionCom?.startPosition?.y ?? 0,
          positionCom?.position?.z ?? positionCom?.startPosition?.z ?? 0
        );

        const orientation = new Quaternion(
          orientationCom?.orientation?.x ??
            orientationCom?.startOrientation?.x ??
            0,
          orientationCom?.orientation?.y ??
            orientationCom?.startOrientation?.y ??
            0,
          orientationCom?.orientation?.z ??
            orientationCom?.startOrientation?.z ??
            0,
          orientationCom?.orientation?.w ??
            orientationCom?.startOrientation?.w ??
            1
        );

        this.#anchorSystem!.addAnchorAtPositionAndRotationAsync(
          position,
          orientation
        )
          .then((webXRAnchor) => {
            console.debug("Add anchor: " + webXRAnchor);

            // Save anchor to component
            anchorCom.webXRAnchor = webXRAnchor;

            anchorCom.isCreatingAnchor = false;
          })
          .catch(() => {
            console.warn("Could not create anchor.");
            anchorCom.isCreatingAnchor = false;
          });
      }

      // Update transform
      const frame = this.#sessionManager!.currentFrame;
      if (!frame || !anchorCom.webXRAnchor) return;

      // Get pose of anchor
      const pose = frame.getPose(
        anchorCom.webXRAnchor.xrAnchor.anchorSpace,
        this.#sessionManager!.referenceSpace
      );

      if (pose) {
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
