import EVENTS from '../events.js';
import external from '../externalModules.js';
import deleteIfHandleOutsideLimits from './deleteIfHandleOutsideLimits.js';
import triggerEvent from '../util/triggerEvent.js';
import clipHandle from './clipHandle.js';
import { state } from './../store/index.js';
import getActiveTool from '../util/getActiveTool';
import BaseAnnotationTool from '../tools/base/BaseAnnotationTool';
import { getLogger } from '../util/logger.js';
import { getModule } from '../store';
import getHandleMovingOptions from './getHandleMovingOptions.js';

const logger = getLogger('manipulators:moveAllHandles');

const manipulatorStateModule = getModule('manipulatorState');

const _dragEvents = {
  mouse: [EVENTS.MOUSE_DRAG],
  touch: [EVENTS.TOUCH_DRAG],
};

const _upOrEndEvents = {
  mouse: [EVENTS.MOUSE_UP, EVENTS.MOUSE_CLICK],
  touch: [
    EVENTS.TOUCH_END,
    EVENTS.TOUCH_DRAG_END,
    EVENTS.TOUCH_PINCH,
    EVENTS.TOUCH_PRESS,
    EVENTS.TAP,
  ],
};

/**
 * Manipulator to move all provided handles at the same time
 * @public
 * @function moveAllHandles
 * @memberof Manipulators
 *
 * @param {*} evtDetail
 * @param {*} evtDetail.element
 * @param {String} toolName
 * @param {*} annotation
 * @param {*} [handle=null] - not needed by moveAllHandles, but keeps call signature the same as `moveHandle`
 * @param {?Object} [options]
 * @param {Boolean} [options.deleteIfHandleOutsideDisplayedArea]
 * @param {Boolean} [options.deleteIfHandleOutsideImage]
 * @param {Boolean} [options.preventHandleOutsideDisplayedArea]
 * @param {Boolean} [options.preventHandleOutsideImage]
 * @param {string} [interactionType=mouse]
 * @param {function} [doneMovingCallback]
 * @returns {undefined}
 */
export default function(
  { element },
  toolName,
  annotation,
  handle,
  options,
  interactionType = 'mouse',
  doneMovingCallback
) {
  let internalOptions = getHandleMovingOptions(options);

  const dragHandler = _dragHandler.bind(
    this,
    toolName,
    annotation,
    internalOptions,
    interactionType
  );
  // So we don't need to inline the entire `upOrEndHandler` function
  const upOrEndHandler = evt => {
    _upOrEndHandler(
      toolName,
      annotation,
      internalOptions,
      interactionType,
      {
        dragHandler,
        upOrEndHandler,
      },
      evt,
      doneMovingCallback
    );
  };

  manipulatorStateModule.setters.addActiveManipulatorForElement(
    element,
    _cancelEventHandler.bind(
      null,
      annotation,
      internalOptions,
      interactionType,
      {
        dragHandler,
        upOrEndHandler,
      },
      element,
      doneMovingCallback
    )
  );

  annotation.active = true;
  state.isToolLocked = true;

  // Add Event Listeners
  _dragEvents[interactionType].forEach(eventType => {
    element.addEventListener(eventType, dragHandler);
  });
  _upOrEndEvents[interactionType].forEach(eventType => {
    element.addEventListener(eventType, upOrEndHandler);
  });
}

function _dragHandler(toolName, annotation, options, interactionType, evt) {
  const { element, image, buttons } = evt.detail;
  const { x, y } = evt.detail.deltaPoints.image;

  annotation.active = true;
  annotation.invalidated = true;

  const handleKeys = Object.keys(annotation.handles);

  for (let i = 0; i < handleKeys.length; i++) {
    const key = handleKeys[i];
    const handle = annotation.handles[key];

    if (
      // Don't move this part of the annotation
      handle.movesIndependently === true ||
      // Not a true handle
      !handle.hasOwnProperty('x') ||
      !handle.hasOwnProperty('y')
    ) {
      continue;
    }

    handle.x += x;
    handle.y += y;

    clipHandle(evt.detail, handle, options);
  }

  external.cornerstone.updateImage(element);

  const activeTool = getActiveTool(element, buttons, interactionType);

  if (activeTool instanceof BaseAnnotationTool) {
    activeTool.updateCachedStats(image, element, annotation);
  }

  const eventType = EVENTS.MEASUREMENT_MODIFIED;
  const modifiedEventData = {
    toolName,
    toolType: toolName, // Deprecation notice: toolType will be replaced by toolName
    element,
    measurementData: annotation,
  };

  triggerEvent(element, eventType, modifiedEventData);

  evt.preventDefault();
  evt.stopPropagation();
}

function _cancelEventHandler(
  annotation,
  options,
  interactionType,
  { dragHandler, upOrEndHandler },
  element,
  doneMovingCallback
) {
  _endHandler(
    annotation,
    options,
    interactionType,
    {
      dragHandler,
      upOrEndHandler,
    },
    element,
    doneMovingCallback,
    false
  );
}

function _upOrEndHandler(
  toolName,
  annotation,
  options,
  interactionType,
  { dragHandler, upOrEndHandler },
  evt,
  doneMovingCallback
) {
  const eventData = evt.detail;
  const { element } = eventData;

  manipulatorStateModule.setters.removeActiveManipulatorForElement(element);

  deleteIfHandleOutsideLimits(eventData, toolName, annotation, options);

  _endHandler(
    annotation,
    options,
    interactionType,
    {
      dragHandler,
      upOrEndHandler,
    },
    element,
    doneMovingCallback,
    true
  );
}

function _endHandler(
  annotation,
  options,
  interactionType,
  { dragHandler, upOrEndHandler },
  element,
  doneMovingCallback,
  success = true
) {
  annotation.active = false;
  annotation.invalidated = true;
  state.isToolLocked = false;

  // Remove Event Listeners
  _dragEvents[interactionType].forEach(eventType => {
    element.removeEventListener(eventType, dragHandler);
  });
  _upOrEndEvents[interactionType].forEach(eventType => {
    element.removeEventListener(eventType, upOrEndHandler);
  });

  if (typeof options.doneMovingCallback === 'function') {
    logger.warn(
      '`options.doneMovingCallback` has been depricated. See https://github.com/cornerstonejs/cornerstoneTools/pull/915 for details.'
    );
    options.doneMovingCallback(success);
  }

  if (typeof doneMovingCallback === 'function') {
    doneMovingCallback(success);
  }

  external.cornerstone.updateImage(element);
}
