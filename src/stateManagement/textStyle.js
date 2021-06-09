const textStyle = {
  fontSize: 15,
  fontFamily: 'Arial',
  backgroundColor: 'transparent',
};

/**
 * @deprecated
 * This function will be deprecated and users must use `setFontSize` and
 * `setFontFamily` to set the font configuration independently.
 *
 * @param {string} font Font string with font size and font family
 * @returns {void}
 */
function setFont(font) {
  const split = font.split('px ');

  if (split.length === 2) {
    setFontSize(split[0]);
    setFontFamily(split[1]);
  }
}

/**
 * Returns all the font styling properties combined into a single string
 * following the CSS font property pattern.
 * @see {@link https://www.w3.org/TR/css-fonts-3/#font-prop|3.7. Shorthand font property: the font property}
 *
 * @returns {string} CSS font property
 */
function getFont() {
  return `${textStyle.fontSize}px ${textStyle.fontFamily}`;
}

/**
 * Sets the font family that will be used for general font rendering.
 * @see {@link https://www.w3.org/TR/css-fonts-3/#font-family-prop|3.1. Font family: the font-family property}
 *
 * @param {string} fontFamily Name of the font to be used
 * @returns {void}
 */
function setFontFamily(fontFamily) {
  textStyle.fontFamily = fontFamily;
}

/**
 * Returns the defined font family for rendering text boxes.
 *
 * @returns {string} The font family used for rendering text boxes
 */
function getFontFamily() {
  return textStyle.fontFamily;
}

/**
 * Sets the font size in pixels that will be used for general font rendering.
 *
 * @param {number} fontSize Font size in pixels
 * @returns {void}
 */
function setFontSize(fontSize) {
  if (typeof fontSize !== 'number' || isNaN(fontSize) || !isFinite(fontSize)) {
    throw new Error('Font size must be a valid number');
  }

  textStyle.fontSize = parseFloat(fontSize);
}

/**
 * Returns the font size in pixels that will be used for general font rendering.
 *
 * @returns {number} Font size in pixels
 */
function getFontSize() {
  return textStyle.fontSize;
}

/**
 * Changes the background color of the text's bounding box.
 * The default background color is transparent, that's why it doesn't display
 * any background for the text box.
 *
 * @param {string} backgroundColor Background color for the text
 * @returns {void}
 */
function setBackgroundColor(backgroundColor) {
  textStyle.backgroundColor = backgroundColor;
}

/**
 * Returns the background color that is being used for rendering text boxes.
 *
 * @returns {string} The background color for the text's bounding box
 */
function getBackgroundColor() {
  return textStyle.backgroundColor;
}

const textStyleApi = {
  setFont,
  getFont,
  setFontSize,
  getFontSize,
  setFontFamily,
  getFontFamily,
  setBackgroundColor,
  getBackgroundColor,
};

export default textStyleApi;
