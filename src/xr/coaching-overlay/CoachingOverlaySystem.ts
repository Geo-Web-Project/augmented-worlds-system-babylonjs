import {
  ComponentType,
  Component,
  System,
  CoachingOverlay,
  Position,
  TrackedImage,
} from "augmented-worlds";
import { WebXRSystem, WebXRFeatureSystem } from "../";
import { WebXRDomOverlay } from "@babylonjs/core";
import Swiper, { Navigation } from "swiper";

/*
 * CoachingOverlaySystem
 *
 * - Creates a coaching overlay with a DOM overlay
 */
export class CoachingOverlaySystem implements System, WebXRFeatureSystem {
  #swiper: Swiper;
  #isLoadingImages: boolean = false;
  #innerDomOverlay: HTMLElement;

  constructor(
    private webXRSystem: WebXRSystem,
    private ipfsGatewayHost: string,
    private domOverlayElement: HTMLElement
  ) {
    webXRSystem.addFeatureSystem(this);

    domOverlayElement.style.display = "flex";
    domOverlayElement.style.flexDirection = "column-reverse";
    domOverlayElement.style.paddingBottom = "50px";

    this.#innerDomOverlay = document.createElement("span");
    this.#innerDomOverlay.style.display = "flex";
    this.#innerDomOverlay.style.flexDirection = "column-reverse";

    // Create coaching text
    const p = document.createElement("p");
    p.id = "coaching-overlay-text";

    this.#innerDomOverlay.appendChild(p);

    // Create Swiper
    const swiper = document.createElement("div");
    swiper.classList.add("swiper");

    const swiperWrapper = document.createElement("div");
    swiperWrapper.classList.add("swiper-wrapper");

    const swiperButtonNext = document.createElement("div");
    swiperButtonNext.id = "swiper-button-next";
    swiperButtonNext.classList.add("swiper-button-next");

    const swiperButtonPrev = document.createElement("div");
    swiperButtonPrev.id = "swiper-button-prev";
    swiperButtonPrev.classList.add("swiper-button-prev");

    swiper.appendChild(swiperWrapper);
    swiper.appendChild(swiperButtonNext);
    swiper.appendChild(swiperButtonPrev);

    this.#innerDomOverlay.appendChild(swiper);

    this.#swiper = new Swiper(".swiper", {
      modules: [Navigation],
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
    });

    domOverlayElement.appendChild(this.#innerDomOverlay);
  }

  async initializeFeature() {
    const featuresManager = await this.webXRSystem.getXRFeaturesManager();

    // Enable DOMOverlay feature
    featuresManager.enableFeature(WebXRDomOverlay, "latest", {
      element: this.domOverlayElement,
    }) as WebXRDomOverlay;
  }

  update(
    getComponent: (
      componentType: ComponentType,
      entityId: number
    ) => Component | undefined,
    getComponents: (componentType: ComponentType) => number[] | undefined
  ): void {
    getComponents(ComponentType.CoachingOverlay)?.map((entityId) => {
      const coachingOverlay = getComponent(
        ComponentType.CoachingOverlay,
        entityId
      ) as CoachingOverlay;

      // Hide coaching overlay if just one image target position is found
      const trackedImageComps = coachingOverlay.trackedImages.map((id) => {
        return {
          trackedImage: getComponent(ComponentType.TrackedImage, id) as
            | TrackedImage
            | undefined,
          position: getComponent(ComponentType.Position, id) as
            | Position
            | undefined,
        };
      });

      const foundImage = trackedImageComps.reduce((prev, cur) => {
        return prev || cur?.position?.position !== undefined;
      }, false);

      if (foundImage) {
        this.#innerDomOverlay.style.visibility = "hidden";
      } else {
        this.#innerDomOverlay.style.visibility = "visible";
      }

      // Load images if needed
      if (this.#isLoadingImages || this.#swiper.slides.length > 0) return;

      this.#isLoadingImages = true;

      document.querySelector("#coaching-overlay-text")!.innerHTML =
        coachingOverlay.text;

      if (trackedImageComps.length < 2) {
        document.getElementById("swiper-button-next")?.remove();
        document.getElementById("swiper-button-prev")?.remove();
      }

      for (const { trackedImage } of trackedImageComps) {
        if (!trackedImage?.imageAsset) continue;

        const swiperSlide = document.createElement("div");
        swiperSlide.classList.add("swiper-slide");
        swiperSlide.style.textAlign = "center";

        const img = document.createElement("img");
        img.src = `${this.ipfsGatewayHost}/ipfs/${trackedImage?.imageAsset["/"]}`;
        img.height = 200;
        img.style.maxWidth = "80vw";
        img.style.margin = "20px";
        swiperSlide.appendChild(img);

        const swiperWrapper = document.querySelector(".swiper-wrapper");
        swiperWrapper?.appendChild(swiperSlide);
      }
    });
  }
}
