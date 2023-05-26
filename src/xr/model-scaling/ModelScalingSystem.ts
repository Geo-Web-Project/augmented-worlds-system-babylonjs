import { ComponentType, Component, System, Scale } from "augmented-worlds";
import { WebXRSystem, WebXRFeatureSystem } from "../";
import { WebXRDomOverlay } from "@babylonjs/core/XR/features/WebXRDOMOverlay";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { Observable } from "@babylonjs/core/Misc/observable";
import { BabylonJsMesh } from "../../graphics";
/*
 * ModelScalingSystem
 *
 * - Creates an overlay to allow scaling a model
 */
export class ModelScalingSystem implements System, WebXRFeatureSystem {
  #innerDomOverlay: HTMLElement;
  #isShowingOverlay: boolean = false;
  #textField: HTMLInputElement;
  #isIncreasing: boolean = false;
  #isDecreasing: boolean = false;
  #shouldIncreaseStep: boolean = false;
  #shouldDecreseStep: boolean = false;

  onModelScaleChanged: Observable<number>;

  static COACHING_TEXT = "Adjust your model size, as desired.";

  constructor(
    private webXRSystem: WebXRSystem,
    private domOverlayElement: HTMLElement,
    private modelEntityId: number
  ) {
    webXRSystem.addFeatureSystem(this);

    this.onModelScaleChanged = new Observable();

    // Buttons
    const addButton = document.createElement("button");
    addButton.innerText = "+";
    addButton.ontouchstart = () => {
      addButton.style.opacity = "0.5";
      this.#shouldIncreaseStep = true;
      const t = setTimeout(() => {
        this.#isIncreasing = true;
      }, 1000);
      addButton.ontouchend = () => {
        clearInterval(t);
        addButton.style.opacity = "1";
        this.#isIncreasing = false;
      };
    };

    const removeButton = document.createElement("button");
    removeButton.innerText = "-";
    removeButton.ontouchstart = () => {
      removeButton.style.opacity = "0.5";
      this.#shouldDecreseStep = true;
      const t = setTimeout(() => {
        this.#isDecreasing = true;
      }, 1000);
      removeButton.ontouchend = () => {
        clearInterval(t);
        removeButton.style.opacity = "1";
        this.#isDecreasing = false;
      };
    };

    for (const button of [addButton, removeButton]) {
      button.classList.add("sizing-button");
      button.style.width = "48px";
      button.style.height = "48px";
      button.style.padding = "5px";
      button.style.fontSize = "2em";
      button.style.margin = "10px";
    }

    // Text field
    this.#textField = document.createElement("input");
    this.#textField.classList.add("scaling-input");
    this.#textField.style.width = "100px";
    this.#textField.style.height = "48px";
    this.#textField.style.fontSize = "2em";
    this.#textField.style.textAlign = "center";
    this.#textField.disabled = true;

    const sizing = document.createElement("div");
    sizing.style.display = "flex";
    sizing.style.justifyContent = "center";
    sizing.style.alignItems = "center";

    sizing.appendChild(removeButton);
    sizing.appendChild(this.#textField);
    sizing.appendChild(addButton);

    // Create coaching text
    const title = document.createElement("p");
    title.innerText = ModelScalingSystem.COACHING_TEXT;
    title.style.color = "white";
    title.style.marginLeft = "20px";
    title.style.marginRight = "20px";
    title.style.textAlign = "center";
    title.style.fontSize = "1.5em";

    this.#innerDomOverlay = document.createElement("div");
    this.#innerDomOverlay.appendChild(sizing);
    this.#innerDomOverlay.appendChild(title);
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
    _getComponents: (componentType: ComponentType) => number[] | undefined
  ): void {
    // Check if mesh is visible
    const component = getComponent(ComponentType.Component, this.modelEntityId);
    const mesh = component as BabylonJsMesh;
    const scale = getComponent(
      ComponentType.Scale,
      this.modelEntityId
    ) as Scale;

    if (this.#isIncreasing || this.#shouldIncreaseStep) {
      const amount = this.#shouldIncreaseStep ? 0.01 : 0.02;
      const newScale = (scale.scale?.x ?? scale.startScale?.x ?? 1) + amount;
      scale.scale = new Vector3(newScale, newScale, newScale);
      this.#shouldIncreaseStep = false;
      this.onModelScaleChanged.notifyObservers(newScale);
    }

    if (this.#isDecreasing || this.#shouldDecreseStep) {
      const amount = this.#shouldDecreseStep ? 0.01 : 0.02;
      const newScale = (scale.scale?.x ?? scale.startScale?.x ?? 1) - amount;
      scale.scale = new Vector3(newScale, newScale, newScale);
      this.#shouldDecreseStep = false;
      this.onModelScaleChanged.notifyObservers(newScale);
    }

    this.#textField.value = `${(
      (scale.scale?.x ?? scale.startScale?.x ?? 1) * 100
    ).toFixed(0)} %`;

    if (mesh?.isVisible) {
      this.domOverlayElement.style.visibility = "visible";

      if (!this.#isShowingOverlay) {
        // Clear DOM overlay and add coaching
        this.domOverlayElement.innerHTML = "";
        this.domOverlayElement.style.display = "flex";
        this.domOverlayElement.style.flexDirection = "column-reverse";
        this.domOverlayElement.style.paddingBottom = "50px";
        this.domOverlayElement.style.alignItems = "center";

        this.domOverlayElement.appendChild(this.#innerDomOverlay);

        this.#isShowingOverlay = true;
      }
    }
  }
}
