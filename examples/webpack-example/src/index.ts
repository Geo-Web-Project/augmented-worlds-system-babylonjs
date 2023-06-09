import init, {
  World,
  ComponentType,
  GLTFModel,
  Position,
  Orientation,
  IsAnchor,
  Anchor,
  TrackedImage,
  CoachingOverlay,
  Scale,
} from "augmented-worlds";
import {
  GraphicsSystem,
  WebXRSystem,
  AnchorSystem,
  AnchorTransformSystem,
  ImageTrackingSystem,
  CoachingOverlaySystem,
  ImageCaptureSystem,
  ModelScalingSystem,
} from "@augmented-worlds/system-babylonjs";

import "@augmented-worlds/system-babylonjs/styles.css";
import "swiper/css";
import "swiper/css/navigation";

init()
  .then(() => {
    return WebXRSystem.isSupported();
  })
  .then((supported) => {
    if (!supported) {
      console.error("immersive-ar session is not supported");
      document.querySelector("button#arButton")!.innerHTML =
        "immersive-ar session is not supported";

      (
        document.querySelector("button#arButton")! as HTMLButtonElement
      ).disabled = true;
      return;
    }
  })
  .then(() => {
    const world = new World();

    // const testAnchor = world.create_entity();
    // world.add_component_to_entity(testAnchor, ComponentType.Component, {});
    // world.add_component_to_entity(testAnchor, ComponentType.Position, {
    //   startPosition: {
    //     x: 0,
    //     y: 0,
    //     z: -1,
    //   },
    // } as Position);
    // world.add_component_to_entity(testAnchor, ComponentType.IsAnchor, {
    //   isAnchor: true,
    // } as IsAnchor);

    const testImageAnchor = world.create_entity();
    world.add_component_to_entity(testImageAnchor, ComponentType.Component, {});
    world.add_component_to_entity(
      testImageAnchor,
      ComponentType.Position,
      {} as Position
    );
    world.add_component_to_entity(
      testImageAnchor,
      ComponentType.Orientation,
      {} as Orientation
    );
    world.add_component_to_entity(testImageAnchor, ComponentType.TrackedImage, {
      imageAsset: {
        "/": "QmZsDopGXAGPtToWSi8bxYjsrZkiraX7wqMZ9K8LgW2tyE",
      },
      physicalWidthInMeters: 0.165,
    } as TrackedImage);
    world.add_component_to_entity(testImageAnchor, ComponentType.IsAnchor, {
      isAnchor: true,
    } as IsAnchor);

    const testImageAnchor1 = world.create_entity();
    world.add_component_to_entity(
      testImageAnchor1,
      ComponentType.Component,
      {}
    );
    world.add_component_to_entity(
      testImageAnchor1,
      ComponentType.Position,
      {} as Position
    );
    world.add_component_to_entity(
      testImageAnchor1,
      ComponentType.Orientation,
      {} as Orientation
    );
    world.add_component_to_entity(
      testImageAnchor1,
      ComponentType.TrackedImage,
      {
        imageAsset: {
          "/": "QmWgve8r2o8NRTjFxEVawXM9nD7m97zDwJS9T4cFER5nVE",
        },
        physicalWidthInMeters: 0.10478,
      } as TrackedImage
    );
    world.add_component_to_entity(testImageAnchor1, ComponentType.IsAnchor, {
      isAnchor: true,
    } as IsAnchor);

    const testEntity = world.create_entity();
    world.add_component_to_entity(testEntity, ComponentType.Component, {});
    world.add_component_to_entity(testEntity, ComponentType.GLTFModel, {
      glTFModel: { "/": "QmdPXtkGThsWvR1YKg4QVSR9n8oHMPmpBEnyyV8Tk638o9" },
    } as GLTFModel);
    world.add_component_to_entity(testEntity, ComponentType.Position, {
      startPosition: {
        x: 0,
        y: 0,
        z: 0,
      },
    } as Position);
    world.add_component_to_entity(testEntity, ComponentType.Orientation, {
      startOrientation: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
      },
    } as Orientation);
    world.add_component_to_entity(testEntity, ComponentType.Scale, {
      startScale: {
        x: 1,
        y: 1,
        z: 1,
      },
    } as Scale);
    world.add_component_to_entity(testEntity, ComponentType.Anchor, {
      anchor: testImageAnchor,
    } as Anchor);

    const coachingOverlayEntity = world.create_entity();
    world.add_component_to_entity(
      coachingOverlayEntity,
      ComponentType.CoachingOverlay,
      {
        trackedImages: [{ "/": testImageAnchor }, { "/": testImageAnchor1 }],
        text: "Point and hold the camera on the image target to enter AR.",
      } as CoachingOverlay
    );

    const graphicsSystem = new GraphicsSystem(
      world,
      document.querySelector("canvas#renderCanvas")!,
      "https://w3s.link"
    );
    const webXRSystem = new WebXRSystem(graphicsSystem.getScene());
    const webXRAnchorSystem = new AnchorSystem(webXRSystem);
    const anchorTransformSystem = new AnchorTransformSystem();
    const imageTrackingSystem = new ImageTrackingSystem(
      webXRSystem,
      "https://w3s.link"
    );
    const coachingOverlaySystem = new CoachingOverlaySystem(
      webXRSystem,
      "https://w3s.link",
      document.querySelector("div#overlay")!
    );
    const modelScalingSystem = new ModelScalingSystem(
      webXRSystem,
      document.querySelector("div#overlay")!,
      testEntity
    );
    // const imageCaptureSystem = new ImageCaptureSystem(
    //   webXRSystem,
    //   document.querySelector("div#overlay")!
    // );

    // imageCaptureSystem.onImageAnchorCaptured.add((imageAnchorCapture) => {
    //   console.log(imageAnchorCapture);
    // });
    world.add_system(graphicsSystem);
    world.add_system(webXRSystem);
    world.add_system(webXRAnchorSystem);
    world.add_system(anchorTransformSystem);
    world.add_system(imageTrackingSystem);
    world.add_system(coachingOverlaySystem);
    world.add_system(modelScalingSystem);
    // world.add_system(imageCaptureSystem);

    document.getElementById("overlay")!.style.display = "none";

    document
      .querySelector("canvas#renderCanvas")!
      .setAttribute("hidden", "true");

    graphicsSystem.start();

    document
      .querySelector("button#arButton")
      ?.addEventListener("click", (_) => {
        webXRSystem.startXRSession();
        document
          .querySelector("canvas#renderCanvas")!
          .removeAttribute("hidden");
        document.getElementById("overlay")!.style.display = "flex";
      });
  });
