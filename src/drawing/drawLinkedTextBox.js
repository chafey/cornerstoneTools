import external from '../externalModules.js';
import drawTextBox from './drawTextBox.js';
import drawLink from './drawLink.js';
import { state } from './../store/index.js';
import { clipBoxToDisplayedArea } from '../util/clip.js';

/**
 * Draw a link between an annotation to a textBox.
 * @public
 * @method drawLinkedTextBox
 * @memberof Drawing
 *
 * @param {Object} context - The canvas context.
 * @param {HTMLElement} element - The element on which to draw the link.
 * @param {Object} textBox - The textBox to link.
 * @param {Object} text - The text to display in the textbox.
 * @param {Object[]} handles - The handles of the annotation.
 * @param {Object[]} textBoxAnchorPoints - An array of possible anchor points on the textBox.
 * @param {string} color - The link color.
 * @param {number} lineWidth - The line width of the link.
 * @param {number} xOffset - The x offset of the textbox.
 * @param {boolean} yCenter - Vertically centers the text if true.
 * @returns {undefined}
 */
export default function(
  context,
  element,
  textBox,
  text,
  handles,
  textBoxAnchorPoints,
  color,
  lineWidth,
  xOffset,
  yCenter
) {
  const { pixelToCanvas } = external.cornerstone;

  // Convert the textbox Image coordinates into Canvas coordinates
  const textCoords = pixelToCanvas(element, textBox);

  if (xOffset) {
    textCoords.x += xOffset;
  }

  const options = {
    centering: {
      x: false,
      y: yCenter,
    },
  };

  // Clip the bounding box to the displayed area of the image
  if (state.preventTextBoxOutsideDisplayedArea) {
    options.translator = box => clipBoxToDisplayedArea(element, box);
  }

  // Draw the text box
  textBox.boundingBox = drawTextBox(
    context,
    text,
    textCoords.x,
    textCoords.y,
    color,
    options
  );
  if (textBox.hasMoved) {
    // Identify the possible anchor points for the tool -> text line
    const linkAnchorPoints = textBoxAnchorPoints(handles).map(h =>
      pixelToCanvas(element, h)
    );

    // Draw dashed link line between tool and text
    drawLink(
      linkAnchorPoints,
      textCoords,
      textBox.boundingBox,
      context,
      color,
      lineWidth
    );
  }
}
