import external from '../externalModules.js';

/**
 * Clips a value to an upper and lower bound.
 * @export @public @method
 * @name clip
 *
 * @param  {number} val  The value to clip.
 * @param  {number} low  The lower bound.
 * @param  {number} high The upper bound.
 * @returns {number}      The clipped value.
 */
export function clip(val, low, high) {
  return Math.min(Math.max(low, val), high);
}

/**
 * Clips a value within a box.
 * @export @public @method
 * @name clipToBox
 *
 * @param  {Object} point The point to clip
 * @param  {Object} box   The bounding box to clip to.
 * @returns {void}
 */
export function clipToBox(point, box) {
  // Clip an {x, y} point to a box {top, left, width, height}
  const left = box.left || 0;
  const top = box.top || 0;

  point.x = clip(point.x, left, left + box.width);
  point.y = clip(point.y, top, top + box.height);
}

/**
 * Returns a new bounding box of rotated text box, relative to the pixel
 * coordinate system. It will get the coordinate of the 4 points of the rotated
 * text box and calculate the AABB (axis-aligned bounding box - lower and upper
 * boundaries for `x` and `y` axes).
 *
 * @param {HTMLElement} element The element to manipulate pixel positioning
 * @param {Object} box - `{ left, top, width, height }` in canvas coordinates
 * @returns {Object} - `{ minX, minY, maxX, maxY }` boundaries of the box
 */
const getBoxPixelBoundaries = (element, box) => {
  const toPixel = point => external.cornerstone.canvasToPixel(element, point);
  const { top, left, width, height } = box;
  const topLeft = toPixel({ x: left, y: top });
  const topRight = toPixel({ x: left + width, y: top });
  const bottomLeft = toPixel({ x: left, y: top + height });
  const bottomRight = toPixel({ x: left + width, y: top + height });
  const points = [topLeft, topRight, bottomLeft, bottomRight];
  const xArray = points.map(p => p.x);
  const yArray = points.map(p => p.y);

  return {
    minX: Math.min(...xArray),
    minY: Math.min(...yArray),
    maxX: Math.max(...xArray),
    maxY: Math.max(...yArray),
  };
};

/**
 * Reposition a box point coordinates in the given axis' upper/lower limits
 *
 * @param {Object} point `{ x, y }` The coordinate point of the box
 * @param {string} axis The axis to be manipulated: `x` or `y`
 * @param {number} boxMin The box position's lower value on axis
 * @param {number} boxMax The box position's upper value on axis
 * @param {number} lowerLimit The lower limit of allowed box position on axis
 * @param {number} upperLimit The upper limit of allowed box position on axis
 * @returns {void}
 */
const clipBoxOnAxis = (point, axis, boxMin, boxMax, lowerLimit, upperLimit) => {
  if (upperLimit - lowerLimit < boxMax - boxMin) {
    // Box is bigger than allowed range, leaking both lower/upper boundaries
    point[axis] += lowerLimit - boxMin; // Stick to the lower boundary
    point[axis] += (upperLimit - lowerLimit) / 2; // Centralize in range
    point[axis] -= (boxMax - boxMin) / 2; // Translate -1/2 of box's size
  } else if (boxMin < lowerLimit) {
    // Box leaked lower boundary
    point[axis] += lowerLimit - boxMin; // Stick to the lower boundary
  } else if (boxMax > upperLimit) {
    // Box leaked upper boundary
    point[axis] -= boxMax - upperLimit; // Stick to the upper boundary
  }
};

/**
 * Clips a box to the viewport's displayed area
 * @export @public @method
 * @name clipBoxToDisplayedArea
 *
 * @param {HTMLElement} element The element to manipulate pixel positioning
 * @param {Object} box - `{ left, top, width, height }` in canvas coordinates
 * @returns {void}
 */
export function clipBoxToDisplayedArea(element, box) {
  const { pixelToCanvas, canvasToPixel, getViewport } = external.cornerstone;

  // Transform the position of given box from canvas to pixel coordinates
  const pixelPosition = canvasToPixel(element, {
    x: box.left,
    y: box.top,
  });

  // Get the rotated corners' position for the box in pixel coordinate system
  const { minX, minY, maxX, maxY } = getBoxPixelBoundaries(element, box);

  // Get the displayed area's top, left, bottom and right boundaries
  const { tlhc, brhc } = getViewport(element).displayedArea;
  const top = tlhc.y - 1;
  const left = tlhc.x - 1;
  const bottom = brhc.y;
  const right = brhc.x;

  // Clip the box on vertical axis
  clipBoxOnAxis(pixelPosition, 'y', minY, maxY, top, bottom);

  // Clip the box on horizontal axis
  clipBoxOnAxis(pixelPosition, 'x', minX, maxX, left, right);

  // Transform the box coordinate system back to canvas
  const newCanvasPosition = pixelToCanvas(element, pixelPosition);

  // Update the box with the new coordinates
  box.top = newCanvasPosition.y;
  box.left = newCanvasPosition.x;
}

export default clip;
