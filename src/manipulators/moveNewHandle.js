import EVENTS from '../events.js';
import external from '../externalModules.js';
import anyHandlesOutsideImage from './anyHandlesOutsideImage.js';
import getHandlePixelPosition from './getHandlePixelPosition.js';
import { removeToolState } from '../stateManagement/toolState.js';
import triggerEvent from '../util/triggerEvent.js';
import { clipToBox } from '../util/clip.js';
import { state } from './../store/index.js';
import getActiveTool from '../util/getActiveTool';
import BaseAnnotationTool from '../tools/base/BaseAnnotationTool';
import { getLogger } from '../util/logger.js';
import { getModule } from '../store/';

const logger = getLogger('manipulators:moveNewHandle');

const manipulatorStateModule = getModule('manipulatorState');

const _moveEvents = {
  mouse: [EVENTS.MOUSE_MOVE, EVENTS.MOUSE_DRAG],
  touch: [EVENTS.TOUCH_DRAG],
};

const _moveEndEvents = {
  mouse: [EVENTS.MOUSE_UP, EVENTS.MOUSE_CLICK],
  touch: [EVENTS.TOUCH_END, EVENTS.TOUCH_PINCH, EVENTS.TAP],
};

/**
 * Move a new handle
 *
 * @public
 * @method moveNewHandle
 * @memberof Manipulators
 *
 * @param {*} eventData
 * @param {*} toolName
 * @param {*} annotation
 * @param {*} handle
 * @param {*} [options={}]
 * @param {Boolean}  [options.deleteIfHandleOutsideImage]
 * @param {Boolean}  [options.preventHandleOutsideImage]
 * @param {string} [interactionType=mouse]
 * @param {function} [doneMovingCallback]
 * @returns {void}
 */
export default function(
  eventData,
  toolName,
  annotation,
  handle,
  options,
  interactionType = 'mouse',
  doneMovingCallback
) {
  // Use global defaults, unless overidden by provided options
  options = Object.assign(
    {
      deleteIfHandleOutsideImage: state.deleteIfHandleOutsideImage,
      preventHandleOutsideImage: state.preventHandleOutsideImage,
    },
    options
  );

  options.hasMoved = false;

  const { element } = eventData;

  annotation.active = true;

  handle.moving = true;
  handle.active = true;
  state.isToolLocked = true;

  function moveHandler(evt) {
    _moveHandler(toolName, annotation, handle, options, interactionType, evt);
  }
  // So we don't need to inline the entire `moveEndEventHandler` function
  function moveEndHandler(evt) {
    _moveEndHandler(
      toolName,
      annotation,
      handle,
      options,
      interactionType,
      {
        moveHandler,
        moveEndHandler,
      },
      evt,
      doneMovingCallback
    );
  }

  // Factory function
  // begin, end, cancel
  // Or... Handle "CANCEL"
  // TODO: SETUP IN all other manipulators

  // Add event listeners
  _moveEvents[interactionType].forEach(eventType => {
    element.addEventListener(eventType, moveHandler);
  });
  element.addEventListener(EVENTS.TOUCH_START, _stopImmediatePropagation);

  _moveEndEvents[interactionType].forEach(eventType => {
    element.addEventListener(eventType, moveEndHandler);
  });

  // When cancelling... What is our active tool?
  // `isToolLocked` ... Track which (annotation) tool is being manipulated
  // If not "completed", removeToolState (maybe an `isComplete` flag)
  // 5 locations: MEASUREMENT_COMPLETED
  // Firing event... Sets `isCompleted` flag for annotation uuid
  manipulatorStateModule.setters.addActiveManipulatorForElement(
    element,
    _cancelEventHandler.bind(
      null,
      annotation,
      handle,
      options,
      interactionType,
      {
        moveHandler,
        moveEndHandler,
      },
      element,
      doneMovingCallback
    )
  );
}

/**
 * Updates annotation as the "pointer" is moved/dragged
 * Emits `cornerstonetoolsmeasurementmodified` events
 *
 * @param {string} toolName
 * @param {*} annotation
 * @param {*} handle
 * @param {*} options
 * @param {string} interactionType
 * @param {*} evt
 *
 * @returns {void}
 */
function _moveHandler(
  toolName,
  annotation,
  handle,
  options,
  interactionType,
  evt
) {
  const { image, element, buttons } = evt.detail;
  const targetLocation = getHandlePixelPosition(evt.detail, interactionType);

  options.hasMoved = true;

  annotation.invalidated = true;
  handle.active = true;
  handle.x = targetLocation.x;
  handle.y = targetLocation.y;

  if (options && options.preventHandleOutsideImage) {
    clipToBox(handle, image);
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
}

function _endHandler(
  interactionType,
  options,
  element,
  { moveHandler, moveEndHandler },
  doneMovingCallback,
  success = true
) {
  // Remove event listeners
  _moveEvents[interactionType].forEach(eventType => {
    element.removeEventListener(eventType, moveHandler);
  });
  _moveEndEvents[interactionType].forEach(eventType => {
    element.removeEventListener(eventType, moveEndHandler);
  });
  element.removeEventListener(EVENTS.TOUCH_START, _stopImmediatePropagation);

  state.isToolLocked = false;

  if (typeof doneMovingCallback === 'function') {
    doneMovingCallback(success);
  }

  if (typeof options.doneMovingCallback === 'function') {
    logger.warn(
      '`options.doneMovingCallback` has been depricated. See https://github.com/cornerstonejs/cornerstoneTools/pull/915 for details.'
    );

    options.doneMovingCallback(success);
  }

  // Update Image
  external.cornerstone.updateImage(element);
}

function _moveEndHandler(
  toolName,
  annotation,
  handle,
  options,
  interactionType,
  { moveHandler, moveEndHandler },
  evt,
  doneMovingCallback
) {
  const eventData = evt.detail;
  const { element } = eventData;
  let moveNewHandleSuccessful = true;

  if (options.hasMoved === false) {
    return;
  }

  const targetLocation = getHandlePixelPosition(eventData, interactionType);

  // "Release" the handle
  annotation.active = false;
  annotation.invalidated = true;
  handle.active = false;
  handle.moving = false;
  handle.x = targetLocation.x;
  handle.y = targetLocation.y;

  manipulatorStateModule.setters.removeActiveManipulatorForElement(element);

  // TODO: WHY?
  // Why would a Touch_Pinch or Touch_Press be associated with a new handle?
  // if (evt.type === EVENTS.TOUCH_PINCH || evt.type === EVENTS.TOUCH_PRESS) {
  //   handle.active = false;
  //   external.cornerstone.updateImage(element);
  //   if (typeof options.doneMovingCallback === 'function') {
  //     logger.warn(
  //       '`options.doneMovingCallback` has been depricated. See https://github.com/cornerstonejs/cornerstoneTools/pull/915 for details.'
  //     );

  //     options.doneMovingCallback(success);
  //   }

  //   if (typeof doneMovingCallback === 'function') {
  //     doneMovingCallback(success);
  //   }

  //   return;
  // }

  if (options.preventHandleOutsideImage) {
    clipToBox(handle, evt.detail.image);
  }

  // If any handle is outside the image, delete the tool data
  if (
    options.deleteIfHandleOutsideImage &&
    anyHandlesOutsideImage(evt.detail, annotation.handles)
  ) {
    annotation.cancelled = true;
    moveNewHandleSuccessful = false;
    removeToolState(element, toolName, annotation);
  }

  _endHandler(
    interactionType,
    options,
    element,
    {
      moveHandler,
      moveEndHandler,
    },
    doneMovingCallback,
    moveNewHandleSuccessful
  );
}

function _cancelEventHandler(
  annotation,
  handle,
  options,
  interactionType,
  { moveHandler, moveEndHandler },
  element,
  doneMovingCallback
) {
  // "Release" the handle
  annotation.active = false;
  annotation.invalidated = true;
  handle.active = false;

  _endHandler(
    interactionType,
    options,
    element,
    {
      moveHandler,
      moveEndHandler,
    },
    doneMovingCallback,
    false
  );
}

/**
 * Stop the CornerstoneToolsTouchStart event from
 * Becoming a CornerstoneToolsTouchStartActive event when
 * MoveNewHandle ends
 *
 * @private
 * @function _stopImmediatePropagation
 *
 * @param {*} evt
 * @returns {Boolean} false
 */
function _stopImmediatePropagation(evt) {
  evt.stopImmediatePropagation();

  return false;
}
