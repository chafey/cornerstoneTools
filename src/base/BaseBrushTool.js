import external from './../externalModules.js';
import EVENTS from './../events.js';
import BaseTool from './../base/BaseTool.js';
// Utils
import isToolActive from '../tools/shared/isToolActive.js';
import store from '../store/index.js';
import { getColormap } from '../colors/colormap.js';

const brushState = store.modules.brush;

export default class BaseBrushTool extends BaseTool {
  constructor ({
    name,
    strategies,
    defaultStrategy,
    configuration,
    supportedInteractionTypes
  }) {
    super({
      name,
      strategies,
      defaultStrategy,
      configuration,
      supportedInteractionTypes
    });

    this.hasCursor = true;
    this.referencedToolData = 'brush';

    this._drawing = false;

    this._drawingMouseUpCallback = this._drawingMouseUpCallback.bind(this);
  }

  //===================================================================
  // Abstract Methods - Must be implemented.
  //===================================================================

  /**
  * Helper function for rendering the brush.
  *
  * @abstract
  * @param {Object} evt - The event.
  */
  renderBrush (evt) {
    throw new Error(`Method renderBrush not implemented for ${this.toolName}.`);
  }

  /**
   * Paints the data to the canvas.
   *
   * @protected
   * @abstract
   * @param  {Object} eventData The data object associated with the event.
   */
  _paint (eventData) {
    throw new Error(`Method _paint not implemented for ${this.toolName}.`);
  }

  //===================================================================
  // Virtual Methods - Have default behavior but may be overriden.
  //===================================================================

  /**
  * Event handler for MOUSE_DRAG event.
  *
  * @virtual
  * @event
  * @param {Object} evt - The event.
  */
  mouseDragCallback (evt) {
    this._startPainting(evt);
  }

  /**
  * Event handler for MOUSE_DOWN event.
  *
  * @virtual
  * @event
  * @param {Object} evt - The event.
  */
  preMouseDownCallback (evt) {
    this._startPainting(evt);

    return true;
  }

  /**
  * Initialise painting with baseBrushTool
  *
  * @protected
  * @virtual
  * @event
  * @param {Object} evt - The event.
  */
  _startPainting (evt) {
    const eventData = evt.detail;
    const element = eventData.element;

    this._paint(eventData);
    this._drawing = true;
    this._startListeningForMouseUp(element);
    this._lastImageCoords = eventData.currentPoints.image;
  }

  /**
  * Event handler for MOUSE_MOVE event.
  *
  * @virtual
  * @event
  * @param {Object} evt - The event.
  */
  mouseMoveCallback (evt) {
    const { currentPoints } = evt.detail;
    this._lastImageCoords = currentPoints.image;
  }

  /**
  * Event handler for switching mode to passive;
  *
  * @virtual
  * @event
  * @param {Object} evt - The event.
  */
  passiveCallback(evt) {
    external.cornerstone.updateImage(this.element);
  }

  /**
  * Used to redraw the tool's annotation data per render.
  *
  * @virtual
  * @param {Object} evt - The event.
  */
  renderToolData (evt) {
    const eventData = evt.detail;
    const element = eventData.element;

    // Only brush needs to render.
    if (isToolActive(element, this.name)) {
      // Call the hover event for the brush
      this.renderBrush(evt);
    }
  }

  /**
  * Switches to the next segmentation color.
  *
  * @virtual
  */
  nextSegmentation () {
    const numberOfColors = this.constructor.getNumberOfColors();

    let drawId = brushState.getters.draw() + 1;

    if (drawId === numberOfColors) {
      drawId = 0;
    }

    brushState.mutations.SET_DRAW_COLOR(drawId);
  }

  /**
  * Switches to the previous segmentation color.
  *
  * @virtual
  */
  previousSegmentation () {
    const configuration = this.configuration;
    const numberOfColors = this.constructor.getNumberOfColors();

    let drawId = brushState.getters.draw() - 1;

    if (drawId < 0) {
      drawId = numberOfColors - 1;
    }

    brushState.mutations.SET_DRAW_COLOR(drawId);

    //this._changeDrawColor(drawId);
  }

  /**
  * Increases the brush size
  *
  * @virtual
  */
  increaseBrushSize () {
    const oldRadius = brushState.getters.radius();
    let newRadius = Math.floor(oldRadius * 1.2);

    // If e.g. only 2 pixels big. Math.floor(2*1.2) = 2.
    // Hence, have minimum increment of 1 pixel.
    if (newRadius === oldRadius) {
      newRadius += 1;
    }

    brushState.mutations.SET_RADIUS(newRadius);
  }

  /**
  * Decreases the brush size
  *
  * @virtual
  */
  decreaseBrushSize () {
    const oldRadius = brushState.getters.radius();
    let newRadius = Math.floor(oldRadius * 0.8);

    brushState.mutations.SET_RADIUS(newRadius);
  }

  //===================================================================
  // Implementation interface
  //===================================================================

  /**
   * Get the draw color (segmentation) of the tool.
   *
   * @protected
   * @param  {Number} drawId The id of the color (segmentation) to switch to.
   */
  _getBrushColor (drawId) {
    const colormap = getColormap(brushState.getters.colorMapId());
    const colorArray = colormap.getColor(drawId);

    if (this._drawing) {
      return `rgba(${colorArray[[0]]}, ${colorArray[[1]]}, ${colorArray[[2]]}, 1.0 )`;
    }

    return `rgba(${colorArray[[0]]}, ${colorArray[[1]]}, ${colorArray[[2]]}, 0.8 )`;
  }

  /**
  * Event handler for MOUSE_UP during the drawing event loop.
  *
  * @protected
  * @event
  * @param {Object} evt - The event.
  */
  _drawingMouseUpCallback(evt) {
    const eventData = evt.detail;
    const element = eventData.element;

    this._drawing = false;
    this._mouseUpRender = true;

    this._stopListeningForMouseUp(element);
  }
  /**
  * Adds modify loop event listeners.
  *
  * @protected
  * @param {Object} element - The viewport element to add event listeners to.
  * @modifies {element}
  */
  _startListeningForMouseUp (element) {
    element.removeEventListener(EVENTS.MOUSE_UP, this._drawingMouseUpCallback);
    element.removeEventListener(EVENTS.MOUSE_CLICK, this._drawingMouseUpCallback);

    element.addEventListener(EVENTS.MOUSE_UP, this._drawingMouseUpCallback);
    element.addEventListener(EVENTS.MOUSE_CLICK, this._drawingMouseUpCallback);

    external.cornerstone.updateImage(element);
  }

  /**
  * Adds modify loop event listeners.
  *
  * @protected
  * @param {Object} element - The viewport element to add event listeners to.
  * @modifies {element}
  */
  _stopListeningForMouseUp (element) {
    element.removeEventListener(EVENTS.MOUSE_UP, this._drawingMouseUpCallback);
    element.removeEventListener(EVENTS.MOUSE_CLICK, this._drawingMouseUpCallback);

    external.cornerstone.updateImage(element);
  }

  //===================================================================
  // Segmentation API. This is effectively a wrapper around the store.
  //===================================================================

  /**
   * Returns the number of colors in the colormap.
   *
   * @static
   * @public
   * @return {Number} The number of colors in the color map.
   */
  static getNumberOfColors () {
    const colormap = getColormap(brushState.getters.colorMapId());

    return colormap.getNumberOfColors();
  }

  /**
   * Displays a segmentation on the element.
   *
   * @public @api
   * @param  {String} enabledElement  The enabledElement on which to display.
   * @param  {Number} segIndex        The index of the segmentation.
   */
  showSegmentationOnElement (segIndex) {
    const enabledElement = this._getEnabledElement();
    const enabledElementUID = enabledElement.uuid;

    brushState.mutations.SET_ELEMENT_BRUSH_VISIBILITY(enabledElementUID, segIndex, true);

    external.cornerstone.updateImage(enabledElement.element);
  }

  /**
   * Hides a segmentation on an element.
   *
   * @public @api
   * @param  {Number} segIndex        The index of the segmentation.
   */
  hideSegmentationOnElement (segIndex) {
    const enabledElement = this._getEnabledElement();
    const enabledElementUID = enabledElement.uuid;

    brushState.mutations.SET_ELEMENT_BRUSH_VISIBILITY(enabledElementUID, segIndex, false);
    external.cornerstone.updateImage(enabledElement.element);
  }

  /**
   * Displays all segmentations on an element.
   *
   * @public @api
   */
  showAllSegmentationsOnElement () {
    const enabledElement = this._getEnabledElement();
    const enabledElementUID = enabledElement.uuid;
    const colormap = getColormap(brushState.getters.colorMapId());
    const numberOfColors = colormap.getNumberOfColors();

    for (let segIndex = 0; segIndex < numberOfColors; segIndex++) {
      brushState.mutations.SET_ELEMENT_BRUSH_VISIBILITY(enabledElementUID, segIndex, true);
    }

    external.cornerstone.updateImage(enabledElement.element);
  }

  /**
   * Hides all segmentations on an element.
   *
   * @public @api
   */
  hideAllSegmentationsOnElement () {
    const enabledElement = this._getEnabledElement();
    const enabledElementUID = enabledElement.uuid;
    const colormap = getColormap(brushState.getters.colorMapId());
    const numberOfColors = colormap.getNumberOfColors();

    for (let segIndex = 0; segIndex < numberOfColors; segIndex++) {
      brushState.mutations.SET_ELEMENT_BRUSH_VISIBILITY(enabledElementUID, segIndex, false);
    }

    external.cornerstone.updateImage(enabledElement.element);
  }

  get alpha () {
    brushState.getters.alpha();
  }

  set alpha (value) {
    const enabledElement = this._getEnabledElement();

    brushState.mutations.SET_ALPHA(value);
    external.cornerstone.updateImage(enabledElement.element);
  }

  get hiddenButActiveAlpha () {
    brushState.getters.hiddenButActiveAlpha();
  }

  set hiddenButActiveAlpha (value) {
    const enabledElement = this._getEnabledElement();

    brushState.mutations.SET_HIDDEN_BUT_ACTIVE_ALPHA(value);
    external.cornerstone.updateImage(enabledElement.element);
  }


  _getEnabledElement () {
    return external.cornerstone.getEnabledElement(this.element);
  }

  /**
   * Returns the toolData type assoicated with this type of tool.
   *
   * @static
   * @public
   * @return {String} The number of colors in the color map.
   */
  static getReferencedToolDataName() {
    return 'brush';
  }
}
