import external from '../externalModules.js';
import { getToolState } from '../stateManagement/toolState.js';

export default class FusionRenderer {
  constructor() {
    this.currentImageIdIndex = 0;
    this.layerIds = [];
    this.findImageFn = undefined;
  }

  render(element, imageStacks) {
    // Move this to base Renderer class
    if (!Number.isInteger(this.currentImageIdIndex)) {
      throw new Error(
        'FusionRenderer: render - Image ID Index is not an integer'
      );
    }

    if (!this.findImageFn) {
      throw new Error('No findImage function has been defined');
    }

    if (!imageStacks) {
      const toolData = getToolState(element, 'stack');

      imageStacks = toolData.data;
    }
    // TODO: Figure out what to do with LoadHandlers in this scenario...

    const cornerstone = external.cornerstone;

    // For the base layer, go to the currentImageIdIndex
    const baseImageObject = imageStacks[0];
    const currentImageId = baseImageObject.imageIds[this.currentImageIdIndex];
    const overlayImageStacks = imageStacks.slice(1, imageStacks.length);

    cornerstone.loadAndCacheImage(currentImageId).then(baseImage => {
      let baseLayerId = this.layerIds[0];

      // Get the base layer if one exists
      if (baseLayerId) {
        cornerstone.setLayerImage(element, baseImage, baseLayerId);
      } else {
        // Otherwise, create a new layer with the base layer's image
        baseLayerId = cornerstone.addLayer(
          element,
          baseImage,
          baseImageObject.options
        );
        this.layerIds.push(baseLayerId);
      }

      // Display the image immediately while the overlay images are identified
      cornerstone.displayImage(element, baseImage);

      // Loop through the remaining 'overlay' image stacks
      overlayImageStacks.forEach((imgObj, overlayLayerIndex) => {
        const imageId = this.findImageFn(imgObj.imageIds, currentImageId);
        const layerIndex = overlayLayerIndex + 1;
        let currentLayerId = this.layerIds[layerIndex];

        // If no layer exists yet for this overlaid stack, create
        // One and add it to the layerIds property for this instance
        // Of the fusion renderer.
        if (!currentLayerId) {
          currentLayerId = cornerstone.addLayer(
            element,
            undefined,
            imgObj.options
          );
          this.layerIds.push(currentLayerId);
        }

        if (imageId) {
          // If an imageId was returned from the findImage function,
          // Load it, make sure it's visible and update the layer
          // With the new image object.
          cornerstone.loadAndCacheImage(imageId).then(image => {
            cornerstone.setLayerImage(element, image, currentLayerId);
            cornerstone.updateImage(element);
          });
        } else {
          // If no imageId was returned from the findImage function.
          // This means that there is no relevant image to display.
          cornerstone.setLayerImage(element, null, currentLayerId);
          cornerstone.setActiveLayer(element, baseLayerId);
          cornerstone.updateImage(element);
        }
      });
    });
  }
}
