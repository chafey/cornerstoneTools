/**
 *  Enumerates the events for CornestoneTools. Native events are captured,
 *  normalized, and re-triggered with a `cornerstonetools` prefix. This allows
 *  us to handle events consistently across different browsers.
 *
 *  @enum {String}
 *  @memberof CornerstoneTools
 *  @readonly
 */
const EVENTS = {
  //
  // MOUSE
  //

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Events/mousedown
   *  @type {String}
   */
  MOUSE_DOWN: 'cornerstonetoolsmousedown',

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Events/mouseup
   *  @type {String}
   */
  MOUSE_UP: 'cornerstonetoolsmouseup',

  /**
   * Is fired if a handled `MOUSE_DOWN` event does not `stopPropagation`. The hook
   * we use to create new measurement data for mouse events.
   *  @type {String}
   */
  MOUSE_DOWN_ACTIVATE: 'cornerstonetoolsmousedownactivate',

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Events/drag
   *  @type {String}
   */
  MOUSE_DRAG: 'cornerstonetoolsmousedrag',

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Events/mousemove
   *  @type {String}
   */
  MOUSE_MOVE: 'cornerstonetoolsmousemove',

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Events/click
   *  @type {String}
   */
  MOUSE_CLICK: 'cornerstonetoolsmouseclick',

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Events/dblclick
   *  @type {String}
   */
  MOUSE_DOUBLE_CLICK: 'cornerstonetoolsmousedoubleclick',

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Events/wheel
   *  @type {String}
   */
  MOUSE_WHEEL: 'cornerstonetoolsmousewheel',

  //
  // TOUCH
  //

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Events/touchstart
   *  @type {String}
   */
  TOUCH_START: 'cornerstonetoolstouchstart',

  /**
   * Is fired if a handled `TOUCH_START` event does not `stopPropagation`. The hook
   * we use to create new measurement data for touch events.
   *  @type {String}
   */
  TOUCH_START_ACTIVE: 'cornerstonetoolstouchstartactive',

  /**
   *  @type {String}
   */
  TOUCH_END: 'cornerstonetoolstouchend',

  /**
   *  @type {String}
   */
  TOUCH_DRAG: 'cornerstonetoolstouchdrag',

  /**
   *  @type {String}
   */
  TOUCH_DRAG_END: 'cornerstonetoolstouchdragend',

  /**
   * http://hammerjs.github.io/recognizer-pinch/
   *  @type {String}
   */
  TOUCH_PINCH: 'cornerstonetoolstouchpinch',

  /**
   * http://hammerjs.github.io/recognizer-rotate/
   *  @type {String}
   */
  TOUCH_ROTATE: 'cornerstonetoolstouchrotate',

  /**
   * http://hammerjs.github.io/recognizer-press/
   *  @type {String}
   */
  TOUCH_PRESS: 'cornerstonetoolstouchpress',

  /**
   * http://hammerjs.github.io/recognizer-tap/
   *  @type {String}
   */
  TAP: 'cornerstonetoolstap',

  /**
   *  @type {String}
   */
  DOUBLE_TAP: 'cornerstonetoolsdoubletap',

  /**
   *  @type {String}
   */
  MULTI_TOUCH_START: 'cornerstonetoolsmultitouchstart',

  /**
   *  @type {String}
   */
  MULTI_TOUCH_START_ACTIVE: 'cornerstonetoolsmultitouchstartactive',

  /**
   *  @type {String}
   */
  MULTI_TOUCH_DRAG: 'cornerstonetoolsmultitouchdrag',

  //
  // KEYBOARD
  //

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Events/keydown
   *  @type {String}
   */
  KEY_DOWN: 'cornerstonetoolskeydown',

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Events/keyup
   *  @type {String}
   */
  KEY_UP: 'cornerstonetoolskeyup',

  /**
   * https://developer.mozilla.org/en-US/docs/Web/Events/keypress
   *  @type {String}
   */
  KEY_PRESS: 'cornerstonetoolskeypress',

  //
  // CUSTOM
  //

  /**
   *  @type {String}
   */
  MEASUREMENT_ADDED: 'cornerstonetoolsmeasurementadded',

  /**
   *  @type {String}
   */
  MEASUREMENT_MODIFIED: 'cornerstonetoolsmeasurementmodified',

  /**
   *  @type {String}
   */
  MEASUREMENT_COMPLETED: 'cornerstonetoolsmeasurementcompleted',

  /**
   *  @type {String}
   */
  MEASUREMENT_REMOVED: 'cornerstonetoolsmeasurementremoved',

  /**
   *  @type {String}
   */
  MEASUREMENT_SELECTED: 'cornerstonetoolsmeasurementselected',

  /**
   *  @type {String}
   */
  TOOL_DEACTIVATED: 'cornerstonetoolstooldeactivated',

  /**
   *  @type {String}
   */
  CLIP_STOPPED: 'cornerstonetoolsclipstopped',

  /**
   *  @type {String}
   */
  STACK_SCROLL: 'cornerstonetoolsstackscroll',

  /**
   *  @type {String}
   */
  STACK_PREFETCH_IMAGE_LOADED: 'cornerstonetoolsstackprefetchimageloaded',

  /**
   *  @type {String}
   */
  STACK_PREFETCH_DONE: 'cornerstonetoolsstackprefetchdone',

  /**
   *  @type {String}
   */
  LABELMAP_MODIFIED: 'cornersontetoolslabelmapmodified',
};

export default EVENTS;
