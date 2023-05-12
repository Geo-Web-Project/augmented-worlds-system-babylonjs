import { ComponentType, Component, System } from "augmented-worlds";

export class BabylonJsGraphicsSystem implements System {
  update(
    _getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined
  ): void {
    console.log("Hello from BabylonJsGraphicsSystem!");
  }
}
