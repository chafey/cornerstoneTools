import { clipToBox, clip } from '../util/clip';

/**
 * Clip the handle inside the image or displayed area's boundaries depending on
 * the defined handle moving options. If both prevention flags are false, it
 * will not change the handle's position.
 * @public
 * @function clipHandle
 * @memberof Manipulators
 *
 * @param {Object} eventData - Data object associated with the event.
 * @param {Object} handle - The handle to be clipped (arg will be mutated)
 * @param {Object} [options={}] - An object containing the handles' moving options
 * @returns {void}
 */
export default function(eventData, handle, options = {}) {
  if (options.preventHandleOutsideDisplayedArea) {
    const { tlhc, brhc } = eventData.viewport.displayedArea;

    handle.x = clip(handle.x, tlhc.x - 1, brhc.x);
    handle.y = clip(handle.y, tlhc.y - 1, brhc.y);
  } else if (options.preventHandleOutsideImage) {
    clipToBox(handle, eventData.image);
  }
}
