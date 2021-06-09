import external from './../../../../externalModules.js';
import { state } from '../../../../store/index.js';
import EVENTS from './../../../../events.js';
import setHandlesPosition from './setHandlesPosition.js';
import getActiveTool from '../../../../util/getActiveTool';
import BaseAnnotationTool from '../../../base/BaseAnnotationTool';
import { clipHandle } from '../../../../manipulators/index.js';

const touchEndEvents = [
  EVENTS.TOUCH_END,
  EVENTS.TOUCH_DRAG_END,
  EVENTS.TOUCH_PINCH,
  EVENTS.TOUCH_PRESS,
  EVENTS.TAP,
];

export default function(
  mouseEventData,
  toolName,
  data,
  handle,
  doneMovingCallback,
  preventHandleOutsideImage
) {
  const { element, image, buttons } = mouseEventData;
  const distanceFromTool = {
    x: handle.x - mouseEventData.currentPoints.image.x,
    y: handle.y - mouseEventData.currentPoints.image.y,
  };

  const touchDragCallback = event => {
    const eventData = event.detail;

    handle.hasMoved = true;

    if (handle.index === undefined || handle.index === null) {
      handle.x = eventData.currentPoints.image.x + distanceFromTool.x;
      handle.y = eventData.currentPoints.image.y + distanceFromTool.y;
    } else {
      setHandlesPosition(handle, eventData, data, distanceFromTool);
    }

    clipHandle(eventData, handle, { preventHandleOutsideImage });

    data.invalidated = true;

    external.cornerstone.updateImage(element);

    const activeTool = getActiveTool(element, buttons, 'touch');

    if (activeTool instanceof BaseAnnotationTool) {
      activeTool.updateCachedStats(image, element, data);
    }

    const modifiedEventData = {
      toolName,
      toolType: toolName, // Deprecation notice: toolType will be replaced by toolName
      element,
      measurementData: data,
    };

    external.cornerstone.triggerEvent(
      element,
      EVENTS.MEASUREMENT_MODIFIED,
      modifiedEventData
    );
  };

  handle.active = true;
  state.isToolLocked = true;

  element.addEventListener(EVENTS.TOUCH_DRAG, touchDragCallback);

  const touchEndCallback = () => {
    handle.active = false;
    state.isToolLocked = false;

    element.removeEventListener(EVENTS.TOUCH_DRAG, touchDragCallback);
    touchEndEvents.forEach(eventType => {
      element.removeEventListener(eventType, touchEndCallback);
    });

    external.cornerstone.updateImage(element);

    if (typeof doneMovingCallback === 'function') {
      doneMovingCallback();
    }
  };

  touchEndEvents.forEach(eventType => {
    element.addEventListener(eventType, touchEndCallback);
  });
}
