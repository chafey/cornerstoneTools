import external from './../../../../externalModules.js';
import { state } from '../../../../store/index.js';
import EVENTS from './../../../../events.js';
import setHandlesPosition from './setHandlesPosition.js';
import getActiveTool from '../../../../util/getActiveTool';
import BaseAnnotationTool from '../../../base/BaseAnnotationTool';
import { clipHandle } from '../../../../manipulators/index.js';

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

  const _dragCallback = event => {
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

    const activeTool = getActiveTool(element, buttons, 'mouse');

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
  handle.moving = true;
  state.isToolLocked = true;

  element.addEventListener(EVENTS.MOUSE_DRAG, _dragCallback);
  element.addEventListener(EVENTS.TOUCH_DRAG, _dragCallback);

  const currentImage = external.cornerstone.getImage(element);
  const imageRenderedHandler = () => {
    const newImage = external.cornerstone.getImage(element);

    // Check if the rendered image changed during measurement modifying and stop it if so
    if (newImage.imageId !== currentImage.imageId) {
      interactionEndCallback();
    }
  };

  // Bind the event listener for image rendering
  element.addEventListener(
    external.cornerstone.EVENTS.IMAGE_RENDERED,
    imageRenderedHandler
  );

  const interactionEndCallback = () => {
    handle.active = false;
    state.isToolLocked = false;

    element.removeEventListener(
      external.cornerstone.EVENTS.IMAGE_RENDERED,
      imageRenderedHandler
    );

    element.removeEventListener(EVENTS.MOUSE_DRAG, _dragCallback);
    element.removeEventListener(EVENTS.MOUSE_UP, interactionEndCallback);
    element.removeEventListener(EVENTS.MOUSE_CLICK, interactionEndCallback);

    element.removeEventListener(EVENTS.TOUCH_DRAG, _dragCallback);
    element.removeEventListener(EVENTS.TOUCH_DRAG_END, interactionEndCallback);
    element.removeEventListener(EVENTS.TAP, interactionEndCallback);

    external.cornerstone.updateImage(element);

    if (typeof doneMovingCallback === 'function') {
      doneMovingCallback();
    }
  };

  element.addEventListener(EVENTS.MOUSE_UP, interactionEndCallback);
  element.addEventListener(EVENTS.MOUSE_CLICK, interactionEndCallback);

  element.addEventListener(EVENTS.TOUCH_DRAG_END, interactionEndCallback);
  element.addEventListener(EVENTS.TAP, interactionEndCallback);
}
