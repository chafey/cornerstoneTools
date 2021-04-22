import EVENTS from '../../events.js';
import external from '../../externalModules.js';
import { state } from '../../store/index.js';
import anyHandlesOutsideImage from './../../manipulators/anyHandlesOutsideImage.js';
import { moveHandle, moveNewHandle } from '../../manipulators/index.js';
import {
  addToolState,
  removeToolState,
} from '../../stateManagement/toolState.js';
import triggerEvent from '../../util/triggerEvent.js';
import { getLogger } from '../../util/logger.js';

const logger = getLogger('eventDispatchers:touchEventHandlers');

export default function(evt, tool) {
  logger.log('addNewMeasurement');

  evt.preventDefault();
  evt.stopPropagation();

  const touchEventData = evt.detail;
  const element = touchEventData.element;
  const measurementData = tool.createNewMeasurement(touchEventData);

  if (!measurementData) {
    return;
  }

  addToolState(element, tool.name, measurementData);

  // Todo: Looks like we're handling the "up" of the tap?
  if (
    Object.keys(measurementData.handles).length === 1 &&
    touchEventData.type === EVENTS.TAP
  ) {
    // Todo: bold assumptions about measurement data for all tools?
    measurementData.active = false;
    measurementData.handles.end.active = false;
    measurementData.handles.end.highlight = false;
    measurementData.invalidated = true;

    const deleteIfHandleOutsideImage =
      state.deleteIfHandleOutsideImage ||
      tool.options.deleteIfHandleOutsideImage;

    if (
      deleteIfHandleOutsideImage &&
      anyHandlesOutsideImage(touchEventData, measurementData.handles)
    ) {
      // Delete the measurement
      removeToolState(element, tool.name, measurementData);
    }

    external.cornerstone.updateImage(element);

    return;
  }

  external.cornerstone.updateImage(element);

  const handleMover =
    Object.keys(measurementData.handles).length === 1
      ? moveHandle
      : moveNewHandle;

  handleMover(
    touchEventData,
    tool.name,
    measurementData,
    measurementData.handles.end,
    tool.options,
    'touch',
    () => {
      const eventType = EVENTS.MEASUREMENT_COMPLETED;
      const eventData = {
        toolName: tool.name,
        toolType: tool.name, // Deprecation notice: toolType will be replaced by toolName
        element,
        measurementData,
      };

      triggerEvent(element, eventType, eventData);
    }
  );
}
