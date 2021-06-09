import EVENTS from '../../events.js';
import external from '../../externalModules.js';
import {
  deleteIfHandleOutsideLimits,
  moveNewHandle,
  getHandleMovingOptions,
} from '../../manipulators/index.js';
import { addToolState } from '../../stateManagement/toolState.js';
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
  const { handles } = measurementData;

  if (!measurementData) {
    return;
  }

  addToolState(element, tool.name, measurementData);

  // Todo: Looks like we're handling the "up" of the tap?
  if (Object.keys(handles).length === 1 && touchEventData.type === EVENTS.TAP) {
    // Todo: bold assumptions about measurement data for all tools?
    measurementData.active = false;
    measurementData.invalidated = true;
    handles.end.active = false;
    handles.end.highlight = false;

    const options = getHandleMovingOptions(tool.options);

    deleteIfHandleOutsideLimits(
      touchEventData,
      tool.name,
      measurementData,
      options
    );

    external.cornerstone.updateImage(element);

    return;
  }

  external.cornerstone.updateImage(element);

  moveNewHandle(
    touchEventData,
    tool.name,
    measurementData,
    handles.end,
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
