/**
 * Determine the coordinates that will place the textbox to the right of the
 * annotation, taking rotation, hflip, and vflip into account.
 *
 * @param {Object} viewport - The object that stores rotation, hflip, and vflip.
 * @param {Object} handles - The handles of the annotation.
 * @returns {Object} - The coordinates for default placement of the textbox
 */
export default function getROITextBoxCoords(viewport, handles) {
  const corners = _determineCorners(handles);
  const centerX = (corners.left.x + corners.right.x) / 2;
  const centerY = (corners.top.y + corners.bottom.y) / 2;
  const textBox = {};

  if (viewport.rotation >= 0 && viewport.rotation < 90) {
    textBox.x = viewport.hflip ? corners.left.x : corners.right.x;
    textBox.y = centerY;
  }
  if (viewport.rotation >= 90 && viewport.rotation < 180) {
    textBox.x = centerX;
    textBox.y = viewport.vflip ? corners.bottom.y : corners.top.y;
  }
  if (viewport.rotation >= 180 && viewport.rotation < 270) {
    textBox.x = viewport.hflip ? corners.right.x : corners.left.x;
    textBox.y = centerY;
  }
  if (viewport.rotation >= 270 && viewport.rotation < 360) {
    textBox.x = centerX;
    textBox.y = viewport.vflip ? corners.top.y : corners.bottom.y;
  }

  return textBox;
}

/**
 * Determine the handles that have the min/max x and y values.
 *
 * @param {Object} handles - The handles of the annotation.
 * @returns {Object} - The top, left, bottom, and right handles
 */
function _determineCorners(handles) {
  const notTextBoxHandles = [];
  Object.keys(handles).forEach(handleKey => {
    const handle = handles[handleKey];
    if (handleKey !== 'textBox' && handle.hasOwnProperty('x') && handle.hasOwnProperty('y')) {
      notTextBoxHandles.push(handles[handleKey]);
    }
  });
  const handlesLeftToRight = notTextBoxHandles.sort(_compareX);
  const handlesTopToBottom = notTextBoxHandles.sort(_compareY);
  const left = handlesLeftToRight[0];
  const right = handlesLeftToRight[handlesLeftToRight.length - 1];
  const top = handlesTopToBottom[0];
  const bottom = handlesTopToBottom[handlesTopToBottom.length - 1];

  return {
    top,
    left,
    bottom,
    right,
  };

  function _compareX(a, b) {
    return a.x < b.x ? -1 : 1;
  }
  function _compareY(a, b) {
    return a.y < b.y ? -1 : 1;
  }
}
