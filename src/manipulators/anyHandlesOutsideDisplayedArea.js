import external from '../externalModules.js';

/**
 * Determine if a handle is outside the bounds of the displayed area of the image.
 * @public
 * @function anyHandlesOutsideDisplayedArea
 * @memberof Manipulators
 *
 * @param {*} renderData - Cornerstone Tool's event detail
 * @param {Object} handles - An object containing named handles
 * @returns {Boolean} - True if the handle was placed outside the displayed area
 */
export default function(renderData, handles) {
  const { tlhc, brhc } = renderData.viewport.displayedArea;
  const left = tlhc.x - 1;
  const top = tlhc.y - 1;
  const imageRect = {
    left,
    top,
    width: brhc.x - left,
    height: brhc.y - top,
  };

  let handleOutsideDisplayedArea = false;

  Object.keys(handles).forEach(function(name) {
    const handle = handles[name];

    if (!!handle.allowedOutsideImage || !!handle.allowedOutsideDisplayedArea) {
      return;
    }

    if (
      external.cornerstoneMath.point.insideRect(handle, imageRect) === false
    ) {
      handleOutsideDisplayedArea = true;
    }
  });

  return handleOutsideDisplayedArea;
}
