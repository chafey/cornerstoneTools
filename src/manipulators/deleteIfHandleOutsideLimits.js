import { removeToolState } from '../stateManagement/toolState.js';
import {
  anyHandlesOutsideDisplayedArea,
  anyHandlesOutsideImage,
} from './index.js';

/**
 * Delete the measurement if it has any handle outside the image or displayed
 * area's boundaries depending on the defined handle moving options.
 * If both deletion flags are false, it will not delete the measurement.
 * @public
 * @function deleteIfHandleOutsideLimits
 * @memberof Manipulators
 *
 * @param {Object} eventData - Data object associated with the event.
 * @param {string} toolName - The tool which the annotation belongs to
 * @param {Object} annotation - The annotation to have its handles verified
 * @param {Object} [options={}] - An object containing the handles' moving options
 * @returns {boolean} if handle outside limits
 */
export default function(eventData, toolName, annotation, options = {}) {
  // // If any handle is outside the image, delete the tool data
  // if (
  //   options.deleteIfHandleOutsideImage &&
  //   anyHandlesOutsideImage(evt.detail, annotation.handles)
  // ) {
  //   annotation.cancelled = true;
  //   moveNewHandleSuccessful = false;
  //   removeToolState(element, toolName, annotation);
  // }

  // If any handle is outside the image, delete the tool data
  if (
    (options.deleteIfHandleOutsideDisplayedArea &&
      anyHandlesOutsideDisplayedArea(eventData, annotation.handles)) ||
    (options.deleteIfHandleOutsideImage &&
      anyHandlesOutsideImage(eventData, annotation.handles))
  ) {
    annotation.cancelled = true;
    removeToolState(eventData.element, toolName, annotation);
    return true;
  }
  return false;
}
