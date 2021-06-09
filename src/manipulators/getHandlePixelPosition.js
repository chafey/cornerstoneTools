import external from '../externalModules.js';
import { state } from './../store/index.js';

/**
 * Return the handle position considering offset for touch interaction.
 * @public
 * @function getHandlePixelPosition
 * @memberof Manipulators
 *
 * @param {Object} eventData - Data object associated with the event
 * @param {string} interactionType - Type of user's input
 * @returns {Object} - The translated point object
 */
export default function(eventData, interactionType) {
  const { currentPoints, element } = eventData;
  const { page } = currentPoints;
  const { handleTouchOffset } = state;

  let offsetX = 0;
  let offsetY = 0;

  if (interactionType === 'touch') {
    offsetX = handleTouchOffset.x;
    offsetY = handleTouchOffset.y;
  }

  return external.cornerstone.pageToPixel(
    element,
    page.x + offsetX,
    page.y + offsetY
  );
}
