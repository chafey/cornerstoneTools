import toolColors from '../../stateManagement/toolColors.js';
import { modules } from '../../store/index.js';

const cursorModule = modules.cursor;

/* eslint-disable valid-jsdoc */

/*
MACROS - The following keys will have the appropriate value injected when
an SVG is requested:

- ACTIVE_COLOR  => options.activeColor || toolColors.getActiveColor();
- TOOL_COLOR    => options.toolColor || toolColors.getToolColor();
- FILL_COLOR    => options.fillColor || toolColors.getFillColor();
*/

export default class MouseCursor {
  constructor(iconGroupString, options) {
    this.iconGroupString = iconGroupString;
    this.options = Object.assign(
      {},
      cursorModule.getters.defaultOptions(),
      options
    );
  }

  /**
   * Returns an SVG of the icon only.
   *
   * @param  {Object} [options={}] - An object which overrides default properties of the returned SVG.
   * @returns {Blob} The SVG of the icon.
   */
  getIconSVG(options = {}) {
    const svgString = this._generateIconSVGString(options);

    return new Blob([svgString], { type: 'image/svg+xml' });
  }

  /**
   *  Returns a string representation of the SVG of the icon only.
   *
   * @param  {Object} [options={}] - An object which overrides default properties of the returned SVG.
   * @returns {string} The stringified SVG of the icon.
   */
  getIconSVGString(options = {}) {
    return this._generateIconSVGString(options);
  }

  /**
   * Returns an SVG of the icon + pointer.
   *
   * @param  {Object} [options={}] - An object which overrides default properties of the returned SVG.
   * @returns {Blob} The SVG of the icon + pointer..
   */
  getIconWithPointerSVG(options = {}) {
    const svgString = this._generateIconWithPointerSVGString(options);

    return new Blob([svgString], { type: 'image/svg+xml' });
  }

  /**
   * Returns a string representation of the SVG of the icon + pointer.
   *
   * @param  {Object} [options={}] - An object which overrides default properties of the returned SVG.
   * @returns {string} The stringified SVG of the icon + pointer.
   */
  getIconWithPointerString(options = {}) {
    return this._generateIconWithPointerSVGString(options);
  }

  /**
   * Returns the mousePoint as a space seperated string.
   *
   * @returns {string} The mousePoint.
   */
  get mousePoint() {
    const mousePoint = this.options.mousePoint;

    return `${mousePoint.x} ${mousePoint.y}`;
  }

  /**
   * Generates a string representation of the icon + pointer.
   *
   * @param  {Object} [options={}] - An object which overrides default properties of the returned string.
   * @returns {string} The SVG as a string.
   */
  _generateIconWithPointerSVGString(options = {}) {
    const svgOptions = Object.assign({}, this.options, options);
    const { mousePointerGroupString, iconSize, viewBox } = svgOptions;

    const scale = iconSize / Math.max(viewBox.x, viewBox.y);
    const svgSize = 16 + iconSize;

    const svgString = `
        <svg
        data-icon="cursor" role="img" xmlns="http://www.w3.org/2000/svg"
        width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}"
      >
        <g>
          ${mousePointerGroupString}
        </g>
        <g transform="translate(16, 16) scale(${scale})">
          ${this.iconGroupString}
        </g>
      </svg>`;

    return this._injectColors(svgString, svgOptions);
  }

  /**
   * Generates a string representation of the icon.
   *
   * @param  {Object} [options={}] - An object which overrides default properties of the returned string.
   * @returns {string} The SVG as a string.
   */
  _generateIconSVGString(options = {}) {
    const svgOptions = Object.assign({}, this.options, options);
    const { iconSize, viewBox } = svgOptions;

    const svgString = `
      <svg
        data-icon="cursor" role="img" xmlns="http://www.w3.org/2000/svg"
        width="${iconSize}" height="${iconSize}" viewBox="0 0
        ${viewBox.x} ${viewBox.y}"
      >
        ${this.iconGroupString}
      </svg>`;

    return this._injectColors(svgString, svgOptions);
  }

  /**
   * Replaces ACTIVE_COLOR, TOOL_COLOR and FILL_COLOR in svgString with their appropriate values.
   *
   * @param  {string} svgString - The string to modify.
   * @param  {Object} options - Optional overrides for the colors.
   * @returns {string} The string with color values injected.
   */
  _injectColors(svgString, options = {}) {
    const activeColor = options.activeColor || toolColors.getActiveColor();
    const toolColor = options.toolColor || toolColors.getToolColor();
    const fillColor = options.fillColor || toolColors.getFillColor();

    return svgString
      .replace(/ACTIVE_COLOR/g, `${activeColor}`)
      .replace(/TOOL_COLOR/g, `${toolColor}`)
      .replace(/FILL_COLOR/g, `${fillColor}`);
  }
}
