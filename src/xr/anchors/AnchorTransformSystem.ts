import {
  ComponentType,
  Component,
  System,
  Position,
  Orientation,
  Anchor,
} from "augmented-worlds";
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math";
import { BabylonJsMesh } from "../../graphics";

/*
 * AnchorTransformSystem
 *
 * - Updates transform of models with anchors
 */
export class AnchorTransformSystem implements System {
  update(
    getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined,
    getComponents: (componentType: ComponentType) => number[] | undefined
  ): void {
    getComponents(ComponentType.Anchor)?.map((entityId) => {
      const component = getComponent(ComponentType.Component, entityId);
      const mesh = component as BabylonJsMesh;
      const anchorCom = getComponent(ComponentType.Anchor, entityId) as Anchor;
      const positionCom = getComponent(
        ComponentType.Position,
        entityId
      ) as Position;
      const orientationCom = getComponent(
        ComponentType.Orientation,
        entityId
      ) as Orientation;

      let anchorPositionXID: number | undefined;
      let anchorPositionYID: number | undefined;
      let anchorPositionZID: number | undefined;

      let anchorOrientationXID: number | undefined;
      let anchorOrientationYID: number | undefined;
      let anchorOrientationZID: number | undefined;
      let anchorOrientationWID: number | undefined;

      // 1. Anchor.anchor
      // 2. Anchor.position
      // 3. Anchor.position.coord
      if (anchorCom.anchor !== undefined) {
        anchorPositionXID = anchorCom.anchor;
        anchorPositionYID = anchorCom.anchor;
        anchorPositionZID = anchorCom.anchor;
        anchorOrientationXID = anchorCom.anchor;
        anchorOrientationYID = anchorCom.anchor;
        anchorOrientationZID = anchorCom.anchor;
        anchorOrientationWID = anchorCom.anchor;
      } else {
        if (typeof anchorCom.position === "number") {
          anchorPositionXID = anchorCom.position;
          anchorPositionYID = anchorCom.position;
          anchorPositionZID = anchorCom.position;
        } else if (anchorCom.position) {
          anchorPositionXID = anchorCom.position.x;
          anchorPositionYID = anchorCom.position.y;
          anchorPositionZID = anchorCom.position.z;
        }

        if (typeof anchorCom.orientation === "number") {
          anchorOrientationXID = anchorCom.orientation;
          anchorOrientationYID = anchorCom.orientation;
          anchorOrientationZID = anchorCom.orientation;
          anchorOrientationWID = anchorCom.orientation;
        } else if (anchorCom.orientation) {
          anchorOrientationXID = anchorCom.orientation.x;
          anchorOrientationYID = anchorCom.orientation.y;
          anchorOrientationZID = anchorCom.orientation.z;
          anchorOrientationWID = anchorCom.orientation.w;
        }
      }

      const anchorPositionX =
        anchorPositionXID !== undefined
          ? (getComponent(
              ComponentType.Position,
              anchorPositionXID
            ) as Position)
          : undefined;
      const anchorPositionY =
        anchorPositionYID !== undefined
          ? (getComponent(
              ComponentType.Position,
              anchorPositionYID
            ) as Position)
          : undefined;
      const anchorPositionZ =
        anchorPositionZID !== undefined
          ? (getComponent(
              ComponentType.Position,
              anchorPositionZID
            ) as Position)
          : undefined;

      const anchorOrientationX =
        anchorOrientationXID !== undefined
          ? (getComponent(
              ComponentType.Orientation,
              anchorOrientationXID
            ) as Orientation)
          : undefined;
      const anchorOrientationY =
        anchorOrientationYID !== undefined
          ? (getComponent(
              ComponentType.Orientation,
              anchorOrientationYID
            ) as Orientation)
          : undefined;
      const anchorOrientationZ =
        anchorOrientationZID !== undefined
          ? (getComponent(
              ComponentType.Orientation,
              anchorOrientationZID
            ) as Orientation)
          : undefined;
      const anchorOrientationW =
        anchorOrientationWID !== undefined
          ? (getComponent(
              ComponentType.Orientation,
              anchorOrientationWID
            ) as Orientation)
          : undefined;

      if (
        anchorPositionX ||
        anchorPositionY ||
        anchorPositionZ ||
        anchorOrientationX ||
        anchorOrientationY ||
        anchorOrientationZ ||
        anchorOrientationW
      ) {
        const newPosition = new Vector3(
          anchorPositionX?.position?.x ??
            anchorPositionX?.startPosition?.x ??
            0,

          anchorPositionY?.position?.y ??
            anchorPositionY?.startPosition?.y ??
            0,

          anchorPositionZ?.position?.z ?? anchorPositionZ?.startPosition?.z ?? 0
        );

        const newOrientation = new Quaternion(
          anchorOrientationX?.orientation?.x ??
            anchorOrientationX?.startOrientation?.x ??
            0,
          anchorOrientationY?.orientation?.y ??
            anchorOrientationY?.startOrientation?.y ??
            0,
          anchorOrientationZ?.orientation?.z ??
            anchorOrientationZ?.startOrientation?.z ??
            0,
          anchorOrientationW?.orientation?.w ??
            anchorOrientationW?.startOrientation?.w ??
            1
        );

        orientationCom.orientation = newOrientation.add(
          new Quaternion(
            orientationCom.startOrientation?.x ?? 0,
            orientationCom.startOrientation?.y ?? 0,
            orientationCom.startOrientation?.z ?? 0,
            orientationCom.startOrientation?.w ?? 1
          )
        );

        positionCom.position = newPosition.add(
          new Vector3(
            positionCom.startPosition?.x ?? 0,
            positionCom.startPosition?.y ?? 0,
            positionCom.startPosition?.z ?? 0
          ).applyRotationQuaternion(newOrientation)
        );

        const shouldShow =
          (anchorPositionX
            ? anchorPositionX?.startPosition !== undefined
            : true) &&
          (anchorPositionY
            ? anchorPositionY?.startPosition !== undefined
            : true) &&
          (anchorPositionZ
            ? anchorPositionZ?.startPosition !== undefined
            : true) &&
          (anchorOrientationX
            ? anchorOrientationX?.startOrientation !== undefined
            : true) &&
          (anchorOrientationY
            ? anchorOrientationY?.startOrientation !== undefined
            : true) &&
          (anchorOrientationZ
            ? anchorOrientationZ?.startOrientation !== undefined
            : true) &&
          (anchorOrientationW
            ? anchorOrientationW?.startOrientation !== undefined
            : true);

        if (mesh.mesh) {
          mesh.mesh.visibility = shouldShow ? 1 : 0;
        }
      } else if (mesh.mesh) {
        // Did not find anchor, mark not visible
        mesh.mesh.visibility = 0;
      }
    });
  }
}
