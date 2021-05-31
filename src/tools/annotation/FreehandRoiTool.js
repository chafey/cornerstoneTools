import EVENTS from './../../events.js';
import external from './../../externalModules.js';
import BaseAnnotationTool from './../base/BaseAnnotationTool.js';
// State
import {
  addToolState,
  getToolState,
  removeToolState,
} from './../../stateManagement/toolState.js';
import toolStyle from './../../stateManagement/toolStyle.js';
import toolColors from './../../stateManagement/toolColors.js';
import { state } from '../../store/index.js';
import triggerEvent from '../../util/triggerEvent.js';
// Manipulators
import { moveHandleNearImagePoint } from '../../util/findAndMoveHelpers.js';
// Implementation Logic
import pointInsideBoundingBox from '../../util/pointInsideBoundingBox.js';
import calculateSUV from '../../util/calculateSUV.js';
import numbersWithCommas from '../../util/numbersWithCommas.js';
import getPixelSpacing from '../../util/getPixelSpacing';

// Drawing
import { getNewContext, draw, drawJoinedLines } from '../../drawing/index.js';
import drawLinkedTextBox from '../../drawing/drawLinkedTextBox.js';
import drawHandles from '../../drawing/drawHandles.js';
import { clipToBox } from '../../util/clip.js';
import { hideToolCursor, setToolCursor } from '../../store/setToolCursor.js';
import { freehandRoiCursor } from '../cursors/index.js';
import freehandUtils from '../../util/freehand/index.js';
import { getLogger } from '../../util/logger.js';
import throttle from '../../util/throttle';
import { getModule } from '../../store/index';

const logger = getLogger('tools:annotation:FreehandRoiTool');

const {
  insertOrDelete,
  freehandArea,
  calculateFreehandStatistics,
  freehandIntersect,
  FreehandHandleData,
} = freehandUtils;

/**
 * @public
 * @class FreehandRoiTool
 * @memberof Tools.Annotation
 * @classdesc Tool for drawing arbitrary polygonal regions of interest, and
 * measuring the statistics of the enclosed pixels.
 * @extends Tools.Base.BaseAnnotationTool
 */
export default class FreehandRoiTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'FreehandRoi',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: defaultFreehandConfiguration(),
      svgCursor: freehandRoiCursor,
    };

    super(props, defaultProps);

    this.isMultiPartTool = true;

    this._drawing = false;
    this._dragging = false;
    this._modifying = false;

    // Create bound callback functions for private event loops
    this._drawingMouseDownCallback = this._drawingMouseDownCallback.bind(this);
    this._drawingMouseMoveCallback = this._drawingMouseMoveCallback.bind(this);
    this._drawingMouseDragCallback = this._drawingMouseDragCallback.bind(this);
    this._drawingMouseUpCallback = this._drawingMouseUpCallback.bind(this);
    this._drawingMouseDoubleClickCallback = this._drawingMouseDoubleClickCallback.bind(
      this
    );
    this._editMouseUpCallback = this._editMouseUpCallback.bind(this);
    this._editMouseDragCallback = this._editMouseDragCallback.bind(this);

    this._drawingTouchStartCallback = this._drawingTouchStartCallback.bind(
      this
    );
    this._drawingTouchDragCallback = this._drawingTouchDragCallback.bind(this);
    this._drawingDoubleTapClickCallback = this._drawingDoubleTapClickCallback.bind(
      this
    );
    this._editTouchDragCallback = this._editTouchDragCallback.bind(this);

    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110);
  }

  createNewMeasurement(eventData) {
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image;

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`
      );

      return;
    }

    const measurementData = {
      visible: true,
      active: true,
      invalidated: true,
      color: undefined,
      handles: {
        points: [],
      },
    };

    measurementData.handles.textBox = {
      active: false,
      hasMoved: false,
      movesIndependently: false,
      drawnIndependently: true,
      allowedOutsideImage: true,
      hasBoundingBox: true,
    };

    return measurementData;
  }

  /**
   *
   *
   * @param {*} element element
   * @param {*} data data
   * @param {*} coords coords
   * @returns {Boolean}
   */
  pointNearTool(element, data, coords) {
    const validParameters = data && data.handles && data.handles.points;

    if (!validParameters) {
      throw new Error(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`
      );
    }

    if (!validParameters || data.visible === false) {
      return false;
    }

    const isPointNearTool = this._pointNearHandle(element, data, coords);

    if (isPointNearTool !== undefined) {
      return true;
    }

    return false;
  }

  /**
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {number} the distance in px from the provided coordinates to the
   * closest rendered portion of the annotation. -1 if the distance cannot be
   * calculated.
   */
  distanceFromPoint(element, data, coords) {
    let distance = Infinity;

    for (let i = 0; i < data.handles.points.length; i++) {
      const distanceI = external.cornerstoneMath.point.distance(
        data.handles.points[i],
        coords
      );

      distance = Math.min(distance, distanceI);
    }

    // If an error caused distance not to be calculated, return -1.
    if (distance === Infinity) {
      return -1;
    }

    return distance;
  }

  /**
   * @param {*} element
   * @param {*} data
   * @param {*} coords
   * @returns {number} the distance in canvas units from the provided coordinates to the
   * closest rendered portion of the annotation. -1 if the distance cannot be
   * calculated.
   */
  distanceFromPointCanvas(element, data, coords) {
    let distance = Infinity;

    if (!data) {
      return -1;
    }

    const canvasCoords = external.cornerstone.pixelToCanvas(element, coords);

    const points = data.handles.points;

    for (let i = 0; i < points.length; i++) {
      const handleCanvas = external.cornerstone.pixelToCanvas(
        element,
        points[i]
      );

      const distanceI = external.cornerstoneMath.point.distance(
        handleCanvas,
        canvasCoords
      );

      distance = Math.min(distance, distanceI);
    }

    // If an error caused distance not to be calculated, return -1.
    if (distance === Infinity) {
      return -1;
    }

    return distance;
  }

  /**
   *
   *
   *
   * @param {Object} image image
   * @param {Object} element element
   * @param {Object} data data
   *
   * @returns {void}  void
   */
  updateCachedStats(image, element, data) {
    // Define variables for the area and mean/standard deviation
    let meanStdDev, meanStdDevSUV;

    const seriesModule = external.cornerstone.metaData.get(
      'generalSeriesModule',
      image.imageId
    );
    const modality = seriesModule ? seriesModule.modality : null;

    const points = data.handles.points;
    // If the data has been invalidated, and the tool is not currently active,
    // We need to calculate it again.

    // Retrieve the bounds of the ROI in image coordinates
    const bounds = {
      left: points[0].x,
      right: points[0].x,
      bottom: points[0].y,
      top: points[0].x,
    };

    for (let i = 0; i < points.length; i++) {
      bounds.left = Math.min(bounds.left, points[i].x);
      bounds.right = Math.max(bounds.right, points[i].x);
      bounds.bottom = Math.min(bounds.bottom, points[i].y);
      bounds.top = Math.max(bounds.top, points[i].y);
    }

    const polyBoundingBox = {
      left: bounds.left,
      top: bounds.bottom,
      width: Math.abs(bounds.right - bounds.left),
      height: Math.abs(bounds.top - bounds.bottom),
    };

    // Store the bounding box information for the text box
    data.polyBoundingBox = polyBoundingBox;

    // First, make sure this is not a color image, since no mean / standard
    // Deviation will be calculated for color images.
    if (!image.color) {
      // Retrieve the array of pixels that the ROI bounds cover
      const pixels = external.cornerstone.getPixels(
        element,
        polyBoundingBox.left,
        polyBoundingBox.top,
        polyBoundingBox.width,
        polyBoundingBox.height
      );

      // Calculate the mean & standard deviation from the pixels and the object shape
      meanStdDev = calculateFreehandStatistics.call(
        this,
        pixels,
        polyBoundingBox,
        data.handles.points
      );

      if (modality === 'PT') {
        // If the image is from a PET scan, use the DICOM tags to
        // Calculate the SUV from the mean and standard deviation.

        // Note that because we are using modality pixel values from getPixels, and
        // The calculateSUV routine also rescales to modality pixel values, we are first
        // Returning the values to storedPixel values before calcuating SUV with them.
        // TODO: Clean this up? Should we add an option to not scale in calculateSUV?
        meanStdDevSUV = {
          mean: calculateSUV(
            image,
            (meanStdDev.mean - image.intercept) / image.slope
          ),
          stdDev: calculateSUV(
            image,
            (meanStdDev.stdDev - image.intercept) / image.slope
          ),
        };
      }

      // If the mean and standard deviation values are sane, store them for later retrieval
      if (meanStdDev && !isNaN(meanStdDev.mean)) {
        data.meanStdDev = meanStdDev;
        data.meanStdDevSUV = meanStdDevSUV;
      }
    }

    // Retrieve the pixel spacing values, and if they are not
    // Real non-zero values, set them to 1
    const { colPixelSpacing, rowPixelSpacing } = getPixelSpacing(image);
    const scaling = (colPixelSpacing || 1) * (rowPixelSpacing || 1);

    const area = freehandArea(data.handles.points, scaling);

    // If the area value is sane, store it for later retrieval
    if (!isNaN(area)) {
      data.area = area;
    }

    // Set the invalidated flag to false so that this data won't automatically be recalculated
    data.invalidated = false;
  }

  /**
   *
   *
   * @param {*} evt
   * @returns {undefined}
   */
  renderToolData(evt) {
    const eventData = evt.detail;

    // If we have no toolState for this element, return immediately as there is nothing to do
    const toolState = getToolState(evt.currentTarget, this.name);

    if (!toolState) {
      return;
    }

    const { image, element } = eventData;
    const config = this.configuration;
    const seriesModule = external.cornerstone.metaData.get(
      'generalSeriesModule',
      image.imageId
    );
    const modality = seriesModule ? seriesModule.modality : null;

    // We have tool data for this element - iterate over each one and draw it
    const context = getNewContext(eventData.canvasContext.canvas);
    const lineWidth = toolStyle.getToolWidth();
    const { renderDashed } = config;
    const lineDash = getModule('globalConfiguration').configuration.lineDash;

    for (let i = 0; i < toolState.data.length; i++) {
      const data = toolState.data[i];

      if (data.visible === false) {
        continue;
      }

      draw(context, context => {
        let color = toolColors.getColorIfActive(data);
        let fillColor;

        if (data.active) {
          if (data.handles.invalidHandlePlacement) {
            color = config.invalidColor;
            fillColor = config.invalidColor;
          } else {
            color = toolColors.getColorIfActive(data);
            fillColor = toolColors.getFillColor();
          }
        } else {
          fillColor = toolColors.getToolColor();
        }

        let options = { color };

        if (renderDashed) {
          options.lineDash = lineDash;
        }

        if (data.handles.points.length) {
          const points = data.handles.points;

          drawJoinedLines(context, element, points[0], points, options);

          if (data.polyBoundingBox) {
            drawJoinedLines(
              context,
              element,
              points[points.length - 1],
              [points[0]],
              options
            );
          } else {
            drawJoinedLines(
              context,
              element,
              points[points.length - 1],
              [config.mouseLocation.handles.start],
              options
            );
          }
        }

        // Draw handles

        options = {
          color,
          fill: fillColor,
        };

        if (config.alwaysShowHandles || (data.active && data.polyBoundingBox)) {
          // Render all handles
          options.handleRadius = config.activeHandleRadius;

          if (this.configuration.drawHandles) {
            drawHandles(context, eventData, data.handles.points, options);
          }
        }

        if (data.canComplete) {
          // Draw large handle at the origin if can complete drawing
          options.handleRadius = config.completeHandleRadius;
          const handle = data.handles.points[0];

          if (this.configuration.drawHandles) {
            drawHandles(context, eventData, [handle], options);
          }
        }

        if (data.active && !data.polyBoundingBox) {
          // Draw handle at origin and at mouse if actively drawing
          options.handleRadius = config.activeHandleRadius;

          if (this.configuration.drawHandles) {
            drawHandles(
              context,
              eventData,
              config.mouseLocation.handles,
              options
            );
          }

          const firstHandle = data.handles.points[0];

          if (this.configuration.drawHandles) {
            drawHandles(context, eventData, [firstHandle], options);
          }
        }

        // Update textbox stats
        if (data.invalidated === true && !data.active) {
          if (data.meanStdDev && data.meanStdDevSUV && data.area) {
            this.throttledUpdateCachedStats(image, element, data);
          } else {
            this.updateCachedStats(image, element, data);
          }
        }

        // Only render text if polygon ROI has been completed and freehand 'shiftKey' mode was not used:
        if (data.polyBoundingBox && !data.handles.textBox.freehand) {
          // If the textbox has not been moved by the user, it should be displayed on the right-most
          // Side of the tool.
          if (!data.handles.textBox.hasMoved) {
            // Find the rightmost side of the polyBoundingBox at its vertical center, and place the textbox here
            // Note that this calculates it in image coordinates
            data.handles.textBox.x =
              data.polyBoundingBox.left + data.polyBoundingBox.width;
            data.handles.textBox.y =
              data.polyBoundingBox.top + data.polyBoundingBox.height / 2;
          }

          const text = textBoxText.call(this, data);

          drawLinkedTextBox(
            context,
            element,
            data.handles.textBox,
            text,
            data.handles.points,
            textBoxAnchorPoints,
            color,
            lineWidth,
            0,
            true
          );
        }
      });
    }

    function textBoxText(data) {
      const { meanStdDev, meanStdDevSUV, area } = data;
      // Define an array to store the rows of text for the textbox
      const textLines = [];

      // If the mean and standard deviation values are present, display them
      if (meanStdDev && meanStdDev.mean !== undefined) {
        // If the modality is CT, add HU to denote Hounsfield Units
        let moSuffix = '';

        if (modality === 'CT') {
          moSuffix = 'HU';
        }
        data.unit = moSuffix;

        // Create a line of text to display the mean and any units that were specified (i.e. HU)
        let meanText = `Mean: ${numbersWithCommas(
          meanStdDev.mean.toFixed(2)
        )} ${moSuffix}`;
        // Create a line of text to display the standard deviation and any units that were specified (i.e. HU)
        let stdDevText = `StdDev: ${numbersWithCommas(
          meanStdDev.stdDev.toFixed(2)
        )} ${moSuffix}`;

        // If this image has SUV values to display, concatenate them to the text line
        if (meanStdDevSUV && meanStdDevSUV.mean !== undefined) {
          const SUVtext = ' SUV: ';

          meanText +=
            SUVtext + numbersWithCommas(meanStdDevSUV.mean.toFixed(2));
          stdDevText +=
            SUVtext + numbersWithCommas(meanStdDevSUV.stdDev.toFixed(2));
        }

        // Add these text lines to the array to be displayed in the textbox
        textLines.push(meanText);
        textLines.push(stdDevText);
      }

      // If the area is a sane value, display it
      if (area) {
        // Determine the area suffix based on the pixel spacing in the image.
        // If pixel spacing is present, use millimeters. Otherwise, use pixels.
        // This uses Char code 178 for a superscript 2
        let suffix = ` mm${String.fromCharCode(178)}`;

        const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image);

        if (!rowPixelSpacing || !colPixelSpacing) {
          suffix = ` pixels${String.fromCharCode(178)}`;
        }

        // Create a line of text to display the area and its units
        const areaText = `Area: ${numbersWithCommas(area.toFixed(2))}${suffix}`;

        // Add this text line to the array to be displayed in the textbox
        textLines.push(areaText);
      }

      return textLines;
    }

    function textBoxAnchorPoints(handles) {
      return handles;
    }
  }

  addNewMeasurement(evt) {
    const eventData = evt.detail;

    this._startDrawing(evt);
    this._addPoint(eventData);

    preventPropagation(evt);
  }

  preMouseDownCallback(evt) {
    const eventData = evt.detail;
    const nearby = this._pointNearHandleAllTools(eventData);

    if (eventData.event.ctrlKey) {
      if (nearby !== undefined && nearby.handleNearby.hasBoundingBox) {
        // Ctrl + clicked textBox, do nothing but still consume event.
      } else {
        insertOrDelete.call(this, evt, nearby);
      }

      preventPropagation(evt);

      return true;
    }

    return false;
  }

  handleSelectedCallback(evt, toolData, handle, interactionType = 'mouse') {
    const { element } = evt.detail;
    const toolState = getToolState(element, this.name);

    if (handle.hasBoundingBox) {
      // Use default move handler.
      moveHandleNearImagePoint(evt, this, toolData, handle, interactionType);

      return;
    }

    const config = this.configuration;

    config.dragOrigin = {
      x: handle.x,
      y: handle.y,
    };

    // Iterating over handles of all toolData instances to find the indices of the selected handle
    for (let toolIndex = 0; toolIndex < toolState.data.length; toolIndex++) {
      const points = toolState.data[toolIndex].handles.points;

      for (let p = 0; p < points.length; p++) {
        if (points[p] === handle) {
          config.currentHandle = p;
          config.currentTool = toolIndex;
        }
      }
    }

    this._modifying = true;

    this._activateModify(element);

    // Interupt eventDispatchers
    preventPropagation(evt);
  }

  /**
   * Event handler for MOUSE_MOVE during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseMoveCallback(evt) {
    const eventData = evt.detail;
    const { currentPoints, element } = eventData;
    const toolState = getToolState(element, this.name);

    const config = this.configuration;
    const currentTool = config.currentTool;

    const data = toolState.data[currentTool];
    const coords = currentPoints.canvas;

    // Set the mouseLocation handle
    this._getMouseLocation(eventData);
    this._checkInvalidHandleLocation(data, eventData);

    // Mouse move -> Polygon Mode
    const handleNearby = this._pointNearHandle(element, data, coords);
    const points = data.handles.points;
    // If there is a handle nearby to snap to
    // (and it's not the actual mouse handle)

    if (
      handleNearby !== undefined &&
      !handleNearby.hasBoundingBox &&
      handleNearby < points.length - 1
    ) {
      config.mouseLocation.handles.start.x = points[handleNearby].x;
      config.mouseLocation.handles.start.y = points[handleNearby].y;
    }

    // Force onImageRendered
    external.cornerstone.updateImage(element);
  }

  /**
   * Event handler for MOUSE_DRAG during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseDragCallback(evt) {
    if (!this.options.mouseButtonMask.includes(evt.detail.buttons)) {
      return;
    }

    this._drawingDrag(evt);
  }

  /**
   * Event handler for TOUCH_DRAG during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingTouchDragCallback(evt) {
    this._drawingDrag(evt);
  }

  _drawingDrag(evt) {
    const eventData = evt.detail;
    const { element } = eventData;

    const toolState = getToolState(element, this.name);

    const config = this.configuration;
    const currentTool = config.currentTool;

    const data = toolState.data[currentTool];

    // Set the mouseLocation handle
    this._getMouseLocation(eventData);
    this._checkInvalidHandleLocation(data, eventData);
    this._addPointPencilMode(eventData, data.handles.points);
    this._dragging = true;

    // Force onImageRendered
    external.cornerstone.updateImage(element);
  }

  /**
   * Event handler for MOUSE_UP during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseUpCallback(evt) {
    const { element } = evt.detail;

    if (!this._dragging) {
      return;
    }

    this._dragging = false;

    const config = this.configuration;
    const currentTool = config.currentTool;
    const toolState = getToolState(element, this.name);
    const data = toolState.data[currentTool];

    if (!freehandIntersect.end(data.handles.points) && data.canComplete) {
      const lastHandlePlaced = config.currentHandle;

      this._endDrawing(element, lastHandlePlaced);
    }

    preventPropagation(evt);

    return;
  }

  /**
   * Event handler for MOUSE_DOWN during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseDownCallback(evt) {
    const eventData = evt.detail;
    const { buttons, currentPoints, element } = eventData;

    if (!this.options.mouseButtonMask.includes(buttons)) {
      return;
    }

    const coords = currentPoints.canvas;

    const config = this.configuration;
    const currentTool = config.currentTool;
    const toolState = getToolState(element, this.name);
    const data = toolState.data[currentTool];

    const handleNearby = this._pointNearHandle(element, data, coords);

    if (!freehandIntersect.end(data.handles.points) && data.canComplete) {
      const lastHandlePlaced = config.currentHandle;

      this._endDrawing(element, lastHandlePlaced);
    } else if (handleNearby === undefined) {
      this._addPoint(eventData);
    }

    preventPropagation(evt);

    return;
  }

  /**
   * Event handler for TOUCH_START during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingTouchStartCallback(evt) {
    const eventData = evt.detail;
    const { currentPoints, element } = eventData;

    const coords = currentPoints.canvas;

    const config = this.configuration;
    const currentTool = config.currentTool;
    const toolState = getToolState(element, this.name);
    const data = toolState.data[currentTool];

    const handleNearby = this._pointNearHandle(element, data, coords);

    if (!freehandIntersect.end(data.handles.points) && data.canComplete) {
      const lastHandlePlaced = config.currentHandle;

      this._endDrawing(element, lastHandlePlaced);
    } else if (handleNearby === undefined) {
      this._addPoint(eventData);
    }

    preventPropagation(evt);

    return;
  }

  /** Ends the active drawing loop and completes the polygon.
   *
   * @public
   * @param {Object} element - The element on which the roi is being drawn.
   * @returns {null}
   */
  completeDrawing(element) {
    if (!this._drawing) {
      return;
    }
    const toolState = getToolState(element, this.name);
    const config = this.configuration;
    const data = toolState.data[config.currentTool];

    if (
      !freehandIntersect.end(data.handles.points) &&
      data.handles.points.length >= 2
    ) {
      const lastHandlePlaced = config.currentHandle;

      data.polyBoundingBox = {};
      this._endDrawing(element, lastHandlePlaced);
    }
  }

  /**
   * Event handler for MOUSE_DOUBLE_CLICK during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingMouseDoubleClickCallback(evt) {
    const { element } = evt.detail;

    this.completeDrawing(element);

    preventPropagation(evt);
  }

  /**
   * Event handler for DOUBLE_TAP during drawing event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _drawingDoubleTapClickCallback(evt) {
    const { element } = evt.detail;

    this.completeDrawing(element);

    preventPropagation(evt);
  }

  /**
   * Event handler for MOUSE_DRAG during handle drag event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _editMouseDragCallback(evt) {
    const eventData = evt.detail;
    const { element, buttons } = eventData;

    if (!this.options.mouseButtonMask.includes(buttons)) {
      return;
    }

    const toolState = getToolState(element, this.name);

    const config = this.configuration;
    const data = toolState.data[config.currentTool];
    const currentHandle = config.currentHandle;
    const points = data.handles.points;
    let handleIndex = -1;

    // Set the mouseLocation handle
    this._getMouseLocation(eventData);

    data.handles.invalidHandlePlacement = freehandIntersect.modify(
      points,
      currentHandle
    );
    data.active = true;
    data.highlight = true;
    points[currentHandle].x = config.mouseLocation.handles.start.x;
    points[currentHandle].y = config.mouseLocation.handles.start.y;

    handleIndex = this._getPrevHandleIndex(currentHandle, points);

    if (currentHandle >= 0) {
      const lastLineIndex = points[handleIndex].lines.length - 1;
      const lastLine = points[handleIndex].lines[lastLineIndex];

      lastLine.x = config.mouseLocation.handles.start.x;
      lastLine.y = config.mouseLocation.handles.start.y;
    }

    // Update the image
    external.cornerstone.updateImage(element);
  }

  /**
   * Event handler for TOUCH_DRAG during handle drag event loop.
   *
   * @event
   * @param {Object} evt - The event.
   * @returns {void}
   */
  _editTouchDragCallback(evt) {
    const eventData = evt.detail;
    const { element } = eventData;

    const toolState = getToolState(element, this.name);

    const config = this.configuration;
    const data = toolState.data[config.currentTool];
    const currentHandle = config.currentHandle;
    const points = data.handles.points;
    let handleIndex = -1;

    // Set the mouseLocation handle
    this._getMouseLocation(eventData);

    data.handles.invalidHandlePlacement = freehandIntersect.modify(
      points,
      currentHandle
    );
    data.active = true;
    data.highlight = true;
    points[currentHandle].x = config.mouseLocation.handles.start.x;
    points[currentHandle].y = config.mouseLocation.handles.start.y;

    handleIndex = this._getPrevHandleIndex(currentHandle, points);

    if (currentHandle >= 0) {
      const lastLineIndex = points[handleIndex].lines.length - 1;
      const lastLine = points[handleIndex].lines[lastLineIndex];

      lastLine.x = config.mouseLocation.handles.start.x;
      lastLine.y = config.mouseLocation.handles.start.y;
    }

    // Update the image
    external.cornerstone.updateImage(element);
  }

  /**
   * Returns the previous handle to the current one.
   * @param {Number} currentHandle - the current handle index
   * @param {Array} points - the handles Array of the freehand data
   * @returns {Number} - The index of the previos handle
   */
  _getPrevHandleIndex(currentHandle, points) {
    if (currentHandle === 0) {
      return points.length - 1;
    }

    return currentHandle - 1;
  }

  /**
   * Event handler for MOUSE_UP during handle drag event loop.
   *
   * @private
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _editMouseUpCallback(evt) {
    const eventData = evt.detail;
    const { element } = eventData;
    const toolState = getToolState(element, this.name);

    this._deactivateModify(element);

    this._dropHandle(eventData, toolState);
    this._endDrawing(element);

    external.cornerstone.updateImage(element);
  }

  /**
   * Places a handle of the freehand tool if the new location is valid.
   * If the new location is invalid the handle snaps back to its previous position.
   *
   * @private
   * @param {Object} eventData - Data object associated with the event.
   * @param {Object} toolState - The data associated with the freehand tool.
   * @modifies {toolState}
   * @returns {undefined}
   */
  _dropHandle(eventData, toolState) {
    const config = this.configuration;
    const currentTool = config.currentTool;
    const handles = toolState.data[currentTool].handles;
    const points = handles.points;

    // Don't allow the line being modified to intersect other lines
    if (handles.invalidHandlePlacement) {
      const currentHandle = config.currentHandle;
      const currentHandleData = points[currentHandle];
      let previousHandleData;

      if (currentHandle === 0) {
        const lastHandleID = points.length - 1;

        previousHandleData = points[lastHandleID];
      } else {
        previousHandleData = points[currentHandle - 1];
      }

      // Snap back to previous position
      currentHandleData.x = config.dragOrigin.x;
      currentHandleData.y = config.dragOrigin.y;
      previousHandleData.lines[0] = currentHandleData;

      handles.invalidHandlePlacement = false;
    }
  }

  /**
   * Begining of drawing loop when tool is active and a click event happens far
   * from existing handles.
   *
   * @private
   * @param {Object} evt - The event.
   * @returns {undefined}
   */
  _startDrawing(evt) {
    const eventData = evt.detail;
    const measurementData = this.createNewMeasurement(eventData);
    const { element } = eventData;
    const config = this.configuration;
    let interactionType;

    if (evt.type === EVENTS.MOUSE_DOWN_ACTIVATE) {
      interactionType = 'Mouse';
    } else if (evt.type === EVENTS.TOUCH_START_ACTIVE) {
      interactionType = 'Touch';
    }
    this._activateDraw(element, interactionType);
    this._getMouseLocation(eventData);

    addToolState(element, this.name, measurementData);

    const toolState = getToolState(element, this.name);

    config.currentTool = toolState.data.length - 1;

    this._activeDrawingToolReference = toolState.data[config.currentTool];
  }

  /**
   * Adds a point on mouse click in polygon mode.
   *
   * @private
   * @param {Object} eventData - data object associated with an event.
   * @returns {undefined}
   */
  _addPoint(eventData) {
    const { currentPoints, element } = eventData;
    const toolState = getToolState(element, this.name);

    // Get the toolState from the last-drawn polygon
    const config = this.configuration;
    const data = toolState.data[config.currentTool];

    if (data.handles.invalidHandlePlacement) {
      return;
    }

    const newHandleData = new FreehandHandleData(currentPoints.image);

    // If this is not the first handle
    if (data.handles.points.length) {
      // Add the line from the current handle to the new handle
      data.handles.points[config.currentHandle - 1].lines.push(
        currentPoints.image
      );
    }

    // Add the new handle
    data.handles.points.push(newHandleData);

    // Increment the current handle value
    config.currentHandle += 1;

    // Force onImageRendered to fire
    external.cornerstone.updateImage(element);
    this.fireModifiedEvent(element, data);
  }

  /**
   * If in pencilMode, check the mouse position is farther than the minimum
   * distance between points, then add a point.
   *
   * @private
   * @param {Object} eventData - Data object associated with an event.
   * @param {Object} points - Data object associated with the tool.
   * @returns {undefined}
   */
  _addPointPencilMode(eventData, points) {
    const config = this.configuration;
    const { element } = eventData;
    const mousePoint = config.mouseLocation.handles.start;

    const handleFurtherThanMinimumSpacing = handle =>
      this._isDistanceLargerThanSpacing(element, handle, mousePoint);

    if (points.every(handleFurtherThanMinimumSpacing)) {
      this._addPoint(eventData);
    }
  }

  /**
   * Ends the active drawing loop and completes the polygon.
   *
   * @private
   * @param {Object} element - The element on which the roi is being drawn.
   * @param {Object} handleNearby - the handle nearest to the mouse cursor.
   * @returns {undefined}
   */
  _endDrawing(element, handleNearby) {
    const toolState = getToolState(element, this.name);
    const config = this.configuration;
    const data = toolState.data[config.currentTool];

    data.active = false;
    data.highlight = false;
    data.handles.invalidHandlePlacement = false;

    // Connect the end handle to the origin handle
    if (handleNearby !== undefined) {
      const points = data.handles.points;

      points[config.currentHandle - 1].lines.push(points[0]);
    }

    if (this._modifying) {
      this._modifying = false;
      data.invalidated = true;
    }

    // Reset the current handle
    config.currentHandle = 0;
    config.currentTool = -1;
    data.canComplete = false;

    if (this._drawing) {
      this._deactivateDraw(element);
    }

    external.cornerstone.updateImage(element);

    this.fireModifiedEvent(element, data);
    this.fireCompletedEvent(element, data);
  }

  /**
   * Returns a handle of a particular tool if it is close to the mouse cursor
   *
   * @private
   * @param {Object} element - The element on which the roi is being drawn.
   * @param {Object} data      Data object associated with the tool.
   * @param {*} coords
   * @returns {Number|Object|Boolean}
   */
  _pointNearHandle(element, data, coords) {
    if (data.handles === undefined || data.handles.points === undefined) {
      return;
    }

    if (data.visible === false) {
      return;
    }

    for (let i = 0; i < data.handles.points.length; i++) {
      const handleCanvas = external.cornerstone.pixelToCanvas(
        element,
        data.handles.points[i]
      );

      if (external.cornerstoneMath.point.distance(handleCanvas, coords) < 6) {
        return i;
      }
    }

    // Check to see if mouse in bounding box of textbox
    if (data.handles.textBox) {
      if (pointInsideBoundingBox(data.handles.textBox, coords)) {
        return data.handles.textBox;
      }
    }
  }

  /**
   * Returns a handle if it is close to the mouse cursor (all tools)
   *
   * @private
   * @param {Object} eventData - data object associated with an event.
   * @returns {Object}
   */
  _pointNearHandleAllTools(eventData) {
    const { currentPoints, element } = eventData;
    const coords = currentPoints.canvas;
    const toolState = getToolState(element, this.name);

    if (!toolState) {
      return;
    }

    let handleNearby;

    for (let toolIndex = 0; toolIndex < toolState.data.length; toolIndex++) {
      handleNearby = this._pointNearHandle(
        element,
        toolState.data[toolIndex],
        coords
      );
      if (handleNearby !== undefined) {
        return {
          handleNearby,
          toolIndex,
        };
      }
    }
  }

  /**
   * Gets the current mouse location and stores it in the configuration object.
   *
   * @private
   * @param {Object} eventData The data assoicated with the event.
   * @returns {undefined}
   */
  _getMouseLocation(eventData) {
    const { currentPoints, image } = eventData;
    // Set the mouseLocation handle
    const config = this.configuration;

    config.mouseLocation.handles.start.x = currentPoints.image.x;
    config.mouseLocation.handles.start.y = currentPoints.image.y;
    clipToBox(config.mouseLocation.handles.start, image);
  }

  /**
   * Returns true if the proposed location of a new handle is invalid.
   *
   * @private
   * @param {Object} data      Data object associated with the tool.
   * @param {Object} eventData The data assoicated with the event.
   * @returns {Boolean}
   */
  _checkInvalidHandleLocation(data, eventData) {
    if (data.handles.points.length < 2) {
      return true;
    }

    let invalidHandlePlacement;

    if (this._dragging) {
      invalidHandlePlacement = this._checkHandlesPencilMode(data, eventData);
    } else {
      invalidHandlePlacement = this._checkHandlesPolygonMode(data, eventData);
    }

    data.handles.invalidHandlePlacement = invalidHandlePlacement;
  }

  /**
   * Returns true if the proposed location of a new handle is invalid (in polygon mode).
   *
   * @private
   *
   * @param {Object} data - data object associated with the tool.
   * @param {Object} eventData The data assoicated with the event.
   * @returns {Boolean}
   */
  _checkHandlesPolygonMode(data, eventData) {
    const config = this.configuration;
    const { element } = eventData;
    const mousePoint = config.mouseLocation.handles.start;
    const points = data.handles.points;
    let invalidHandlePlacement = false;

    data.canComplete = false;

    const mouseAtOriginHandle = this._isDistanceSmallerThanCompleteSpacingCanvas(
      element,
      points[0],
      mousePoint
    );

    if (
      mouseAtOriginHandle &&
      !freehandIntersect.end(points) &&
      points.length > 2
    ) {
      data.canComplete = true;
      invalidHandlePlacement = false;
    } else {
      invalidHandlePlacement = freehandIntersect.newHandle(mousePoint, points);
    }

    return invalidHandlePlacement;
  }

  /**
   * Returns true if the proposed location of a new handle is invalid (in pencilMode).
   *
   * @private
   * @param {Object} data - data object associated with the tool.
   * @param {Object} eventData The data associated with the event.
   * @returns {Boolean}
   */
  _checkHandlesPencilMode(data, eventData) {
    const config = this.configuration;
    const mousePoint = config.mouseLocation.handles.start;
    const points = data.handles.points;
    let invalidHandlePlacement = freehandIntersect.newHandle(
      mousePoint,
      points
    );

    if (invalidHandlePlacement === false) {
      invalidHandlePlacement = this._invalidHandlePencilMode(data, eventData);
    }

    return invalidHandlePlacement;
  }

  /**
   * Returns true if the mouse position is far enough from previous points (in pencilMode).
   *
   * @private
   * @param {Object} data - data object associated with the tool.
   * @param {Object} eventData The data associated with the event.
   * @returns {Boolean}
   */
  _invalidHandlePencilMode(data, eventData) {
    const config = this.configuration;
    const { element } = eventData;
    const mousePoint = config.mouseLocation.handles.start;
    const points = data.handles.points;

    const mouseAtOriginHandle = this._isDistanceSmallerThanCompleteSpacingCanvas(
      element,
      points[0],
      mousePoint
    );

    if (mouseAtOriginHandle) {
      data.canComplete = true;

      return false;
    }

    data.canComplete = false;

    // Compare with all other handles appart from the last one
    for (let i = 1; i < points.length - 1; i++) {
      if (this._isDistanceSmallerThanSpacing(element, points[i], mousePoint)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns true if two points are closer than this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @returns {boolean}            True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _isDistanceSmallerThanCompleteSpacingCanvas(element, p1, p2) {
    const p1Canvas = external.cornerstone.pixelToCanvas(element, p1);
    const p2Canvas = external.cornerstone.pixelToCanvas(element, p2);

    let completeHandleRadius;

    if (this._drawingInteractionType === 'Mouse') {
      completeHandleRadius = this.configuration.completeHandleRadius;
    } else if (this._drawingInteractionType === 'Touch') {
      completeHandleRadius = this.configuration.completeHandleRadiusTouch;
    }

    return this._compareDistanceToSpacing(
      element,
      p1Canvas,
      p2Canvas,
      '<',
      completeHandleRadius
    );
  }

  /**
   * Returns true if two points are closer than this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @returns {boolean}            True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _isDistanceSmallerThanSpacing(element, p1, p2) {
    return this._compareDistanceToSpacing(element, p1, p2, '<');
  }

  /**
   * Returns true if two points are farther than this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @returns {boolean}            True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _isDistanceLargerThanSpacing(element, p1, p2) {
    return this._compareDistanceToSpacing(element, p1, p2, '>');
  }

  /**
   * Compares the distance between two points to this.configuration.spacing.
   *
   * @private
   * @param  {Object} element     The element on which the roi is being drawn.
   * @param  {Object} p1          The first point, in pixel space.
   * @param  {Object} p2          The second point, in pixel space.
   * @param  {string} comparison  The comparison to make.
   * @param  {number} spacing     The allowed canvas spacing
   * @returns {boolean}           True if the distance is smaller than the
   *                              allowed canvas spacing.
   */
  _compareDistanceToSpacing(
    element,
    p1,
    p2,
    comparison = '>',
    spacing = this.configuration.spacing
  ) {
    if (comparison === '>') {
      return external.cornerstoneMath.point.distance(p1, p2) > spacing;
    }

    return external.cornerstoneMath.point.distance(p1, p2) < spacing;
  }

  /**
   * Adds drawing loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @param {string} interactionType - The interactionType used for the loop.
   * @modifies {element}
   * @returns {undefined}
   */
  _activateDraw(element, interactionType = 'Mouse') {
    this._drawing = true;
    this._drawingInteractionType = interactionType;

    state.isMultiPartToolActive = true;
    hideToolCursor(this.element);

    // Polygonal Mode
    element.addEventListener(EVENTS.MOUSE_DOWN, this._drawingMouseDownCallback);
    element.addEventListener(EVENTS.MOUSE_MOVE, this._drawingMouseMoveCallback);
    element.addEventListener(
      EVENTS.MOUSE_DOUBLE_CLICK,
      this._drawingMouseDoubleClickCallback
    );

    // Drag/Pencil Mode
    element.addEventListener(EVENTS.MOUSE_DRAG, this._drawingMouseDragCallback);
    element.addEventListener(EVENTS.MOUSE_UP, this._drawingMouseUpCallback);

    // Touch
    element.addEventListener(
      EVENTS.TOUCH_START,
      this._drawingMouseMoveCallback
    );
    element.addEventListener(
      EVENTS.TOUCH_START,
      this._drawingTouchStartCallback
    );

    element.addEventListener(EVENTS.TOUCH_DRAG, this._drawingTouchDragCallback);
    element.addEventListener(EVENTS.TOUCH_END, this._drawingMouseUpCallback);
    element.addEventListener(
      EVENTS.DOUBLE_TAP,
      this._drawingDoubleTapClickCallback
    );

    external.cornerstone.updateImage(element);
  }

  /**
   * Removes drawing loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {undefined}
   */
  _deactivateDraw(element) {
    this._drawing = false;
    state.isMultiPartToolActive = false;
    this._activeDrawingToolReference = null;
    this._drawingInteractionType = null;
    setToolCursor(this.element, this.svgCursor);

    element.removeEventListener(
      EVENTS.MOUSE_DOWN,
      this._drawingMouseDownCallback
    );
    element.removeEventListener(
      EVENTS.MOUSE_MOVE,
      this._drawingMouseMoveCallback
    );
    element.removeEventListener(
      EVENTS.MOUSE_DOUBLE_CLICK,
      this._drawingMouseDoubleClickCallback
    );
    element.removeEventListener(
      EVENTS.MOUSE_DRAG,
      this._drawingMouseDragCallback
    );
    element.removeEventListener(EVENTS.MOUSE_UP, this._drawingMouseUpCallback);

    // Touch
    element.removeEventListener(
      EVENTS.TOUCH_START,
      this._drawingTouchStartCallback
    );
    element.removeEventListener(
      EVENTS.TOUCH_DRAG,
      this._drawingTouchDragCallback
    );
    element.removeEventListener(
      EVENTS.TOUCH_START,
      this._drawingMouseMoveCallback
    );
    element.removeEventListener(EVENTS.TOUCH_END, this._drawingMouseUpCallback);

    external.cornerstone.updateImage(element);
  }

  /**
   * Adds modify loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {undefined}
   */
  _activateModify(element) {
    state.isToolLocked = true;

    element.addEventListener(EVENTS.MOUSE_UP, this._editMouseUpCallback);
    element.addEventListener(EVENTS.MOUSE_DRAG, this._editMouseDragCallback);
    element.addEventListener(EVENTS.MOUSE_CLICK, this._editMouseUpCallback);

    element.addEventListener(EVENTS.TOUCH_END, this._editMouseUpCallback);
    element.addEventListener(EVENTS.TOUCH_DRAG, this._editTouchDragCallback);

    external.cornerstone.updateImage(element);
  }

  /**
   * Removes modify loop event listeners.
   *
   * @private
   * @param {Object} element - The viewport element to add event listeners to.
   * @modifies {element}
   * @returns {undefined}
   */
  _deactivateModify(element) {
    state.isToolLocked = false;

    element.removeEventListener(EVENTS.MOUSE_UP, this._editMouseUpCallback);
    element.removeEventListener(EVENTS.MOUSE_DRAG, this._editMouseDragCallback);
    element.removeEventListener(EVENTS.MOUSE_CLICK, this._editMouseUpCallback);

    element.removeEventListener(EVENTS.TOUCH_END, this._editMouseUpCallback);
    element.removeEventListener(EVENTS.TOUCH_DRAG, this._editTouchDragCallback);

    external.cornerstone.updateImage(element);
  }

  passiveCallback(element) {
    this._closeToolIfDrawing(element);
  }

  enabledCallback(element) {
    this._closeToolIfDrawing(element);
  }

  disabledCallback(element) {
    this._closeToolIfDrawing(element);
  }

  _closeToolIfDrawing(element) {
    if (this._drawing) {
      // Actively drawing but changed mode.
      const config = this.configuration;
      const lastHandlePlaced = config.currentHandle;

      this._endDrawing(element, lastHandlePlaced);
      external.cornerstone.updateImage(element);
    }
  }

  /**
   * Fire MEASUREMENT_MODIFIED event on provided element
   * @param {any} element which freehand data has been modified
   * @param {any} measurementData the measurment data
   * @returns {void}
   */
  fireModifiedEvent(element, measurementData) {
    const eventType = EVENTS.MEASUREMENT_MODIFIED;
    const eventData = {
      toolName: this.name,
      toolType: this.name, // Deprecation notice: toolType will be replaced by toolName
      element,
      measurementData,
    };

    triggerEvent(element, eventType, eventData);
  }

  fireCompletedEvent(element, measurementData) {
    const eventType = EVENTS.MEASUREMENT_COMPLETED;
    const eventData = {
      toolName: this.name,
      toolType: this.name, // Deprecation notice: toolType will be replaced by toolName
      element,
      measurementData,
    };

    triggerEvent(element, eventType, eventData);
  }

  // ===================================================================
  // Public Configuration API. .
  // ===================================================================

  get spacing() {
    return this.configuration.spacing;
  }

  set spacing(value) {
    if (typeof value !== 'number') {
      throw new Error(
        'Attempting to set freehand spacing to a value other than a number.'
      );
    }

    this.configuration.spacing = value;
    external.cornerstone.updateImage(this.element);
  }

  get activeHandleRadius() {
    return this.configuration.activeHandleRadius;
  }

  set activeHandleRadius(value) {
    if (typeof value !== 'number') {
      throw new Error(
        'Attempting to set freehand activeHandleRadius to a value other than a number.'
      );
    }

    this.configuration.activeHandleRadius = value;
    external.cornerstone.updateImage(this.element);
  }

  get completeHandleRadius() {
    return this.configuration.completeHandleRadius;
  }

  set completeHandleRadius(value) {
    if (typeof value !== 'number') {
      throw new Error(
        'Attempting to set freehand completeHandleRadius to a value other than a number.'
      );
    }

    this.configuration.completeHandleRadius = value;
    external.cornerstone.updateImage(this.element);
  }

  get alwaysShowHandles() {
    return this.configuration.alwaysShowHandles;
  }

  set alwaysShowHandles(value) {
    if (typeof value !== 'boolean') {
      throw new Error(
        'Attempting to set freehand alwaysShowHandles to a value other than a boolean.'
      );
    }

    this.configuration.alwaysShowHandles = value;
    external.cornerstone.updateImage(this.element);
  }

  get invalidColor() {
    return this.configuration.invalidColor;
  }

  set invalidColor(value) {
    /*
      It'd be easy to check if the color was e.g. a valid rgba color. However
      it'd be difficult to check if the color was a named CSS color without
      bloating the library, so we don't. If the canvas can't intepret the color
      it'll show up grey.
    */

    this.configuration.invalidColor = value;
    external.cornerstone.updateImage(this.element);
  }

  /**
   * Ends the active drawing loop and removes the polygon.
   *
   * @public
   * @param {Object} element - The element on which the roi is being drawn.
   * @returns {null}
   */
  cancelDrawing(element) {
    if (!this._drawing) {
      return;
    }
    const toolState = getToolState(element, this.name);

    const config = this.configuration;

    const data = toolState.data[config.currentTool];

    data.active = false;
    data.highlight = false;
    data.handles.invalidHandlePlacement = false;

    // Reset the current handle
    config.currentHandle = 0;
    config.currentTool = -1;
    data.canComplete = false;

    removeToolState(element, this.name, data);

    this._deactivateDraw(element);

    external.cornerstone.updateImage(element);
  }

  /**
   * New image event handler.
   *
   * @public
   * @param  {Object} evt The event.
   * @returns {null}
   */
  newImageCallback(evt) {
    const config = this.configuration;

    if (!(this._drawing && this._activeDrawingToolReference)) {
      return;
    }

    // Actively drawing but scrolled to different image.

    const element = evt.detail.element;
    const data = this._activeDrawingToolReference;

    data.active = false;
    data.highlight = false;
    data.handles.invalidHandlePlacement = false;

    // Connect the end handle to the origin handle
    const points = data.handles.points;

    points[config.currentHandle - 1].lines.push(points[0]);

    // Reset the current handle
    config.currentHandle = 0;
    config.currentTool = -1;
    data.canComplete = false;

    this._deactivateDraw(element);

    external.cornerstone.updateImage(element);
  }
}

function defaultFreehandConfiguration() {
  return {
    mouseLocation: {
      handles: {
        start: {
          highlight: true,
          active: true,
        },
      },
    },
    spacing: 1,
    activeHandleRadius: 3,
    completeHandleRadius: 6,
    completeHandleRadiusTouch: 28,
    alwaysShowHandles: false,
    invalidColor: 'crimson',
    currentHandle: 0,
    currentTool: -1,
    drawHandles: true,
    renderDashed: false,
  };
}

function preventPropagation(evt) {
  evt.stopImmediatePropagation();
  evt.stopPropagation();
  evt.preventDefault();
}
