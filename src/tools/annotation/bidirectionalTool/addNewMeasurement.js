import external from './../../../externalModules.js';
import EVENTS from './../../../events.js';
import {
  moveNewHandle,
  anyHandlesOutsideDisplayedArea,
  anyHandlesOutsideImage,
} from './../../../manipulators/index.js';
import {
  addToolState,
  removeToolState,
} from './../../../stateManagement/toolState.js';
import triggerEvent from '../../../util/triggerEvent.js';
import getActiveTool from '../../../util/getActiveTool';
import BidirectionalTool from '../BidirectionalTool';
import updatePerpendicularLineHandles from './utils/updatePerpendicularLineHandles.js';

export default function(evt, interactionType) {
  const eventData = evt.detail;
  const { element, image, buttons } = eventData;

  const config = this.configuration;

  if (checkPixelSpacing(image)) {
    return;
  }

  const measurementData = this.createNewMeasurement(eventData);

  const doneCallback = () => {
    measurementData.active = false;
    external.cornerstone.updateImage(element);
  };

  // Associate this data with this imageId so we can render it and manipulate it
  addToolState(element, this.name, measurementData);
  external.cornerstone.updateImage(element);

  const timestamp = new Date().getTime();
  const { end, perpendicularStart } = measurementData.handles;

  moveNewHandle(
    eventData,
    this.name,
    measurementData,
    end,
    {},
    interactionType,
    success => {
      if (!success) {
        removeToolState(element, this.name, measurementData);

        return;
      }
      const { handles, longestDiameter, shortestDiameter } = measurementData;
      const hasHandlesOutside =
        anyHandlesOutsideImage(eventData, handles) ||
        anyHandlesOutsideDisplayedArea(eventData, handles);
      const longestDiameterSize = parseFloat(longestDiameter) || 0;
      const shortestDiameterSize = parseFloat(shortestDiameter) || 0;
      const isTooSmal = longestDiameterSize < 1 || shortestDiameterSize < 1;
      const isTooFast = new Date().getTime() - timestamp < 150;

      if (hasHandlesOutside || isTooSmal || isTooFast) {
        // Delete the measurement
        measurementData.cancelled = true;
        removeToolState(element, this.name, measurementData);
      } else {
        // Set lesionMeasurementData Session
        config.getMeasurementLocationCallback(
          measurementData,
          eventData,
          doneCallback
        );
      }

      // Update perpendicular line and disconnect it from the long-line
      updatePerpendicularLineHandles(eventData, measurementData);
      perpendicularStart.locked = false;

      measurementData.invalidated = true;

      external.cornerstone.updateImage(element);

      const activeTool = getActiveTool(element, buttons, interactionType);

      if (activeTool instanceof BidirectionalTool) {
        activeTool.updateCachedStats(image, element, measurementData);
      }

      const modifiedEventData = {
        toolName: this.name,
        toolType: this.name, // Deprecation notice: toolType will be replaced by toolName
        element,
        measurementData,
      };

      triggerEvent(element, EVENTS.MEASUREMENT_MODIFIED, modifiedEventData);
      triggerEvent(element, EVENTS.MEASUREMENT_COMPLETED, modifiedEventData);
    }
  );
}

const checkPixelSpacing = image => {
  const imagePlane = external.cornerstone.metaData.get(
    'imagePlaneModule',
    image.imageId
  );
  let rowPixelSpacing = image.rowPixelSpacing;
  let colPixelSpacing = image.columnPixelSpacing;

  if (imagePlane) {
    rowPixelSpacing =
      imagePlane.rowPixelSpacing || imagePlane.rowImagePixelSpacing;
    colPixelSpacing =
      imagePlane.columnPixelSpacing || imagePlane.colImagePixelSpacing;
  }

  // LT-29 Disable Target Measurements when pixel spacing is not available
  return !rowPixelSpacing || !colPixelSpacing;
};
