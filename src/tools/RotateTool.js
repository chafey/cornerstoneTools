import external from './../externalModules.js';
import BaseTool from './base/BaseTool.js';
import angleBetweenPoints from '../util/angleBetweenPoints.js';
import { rotateCursor } from './cursors/index.js';

/**
 * @public
 * @class RotateTool
 * @memberof Tools
 *
 * @classdesc Tool for rotating the image.
 * @extends Tools.Base.BaseTool
 */
export default class RotateTool extends BaseTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'Rotate',
      strategies: {
        default: defaultStrategy,
        horizontal: horizontalStrategy,
        vertical: verticalStrategy,
      },
      defaultStrategy: 'default',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {
        roundAngles: false,
        flipHorizontal: false,
        flipVertical: false,
        rotateScale: 1,
      },
      svgCursor: rotateCursor,
    };

    super(props, defaultProps);
  }

  touchDragCallback(evt) {
    this.dragCallback(evt);
  }

  mouseDragCallback(evt) {
    this.dragCallback(evt);
  }

  postMouseDownCallback(evt) {
    this.initialRotation = evt.detail.viewport.rotation;
  }

  dragCallback(evt) {
    evt.detail.viewport.initialRotation = this.initialRotation;
    this.applyActiveStrategy(evt);
    external.cornerstone.setViewport(evt.detail.element, evt.detail.viewport);
  }
}

function defaultStrategy(evt) {
  const { roundAngles, rotateScale } = this.configuration;
  const { element, viewport, startPoints, currentPoints } = evt.detail;

  const initialRotation = viewport.initialRotation
    ? viewport.initialRotation
    : viewport.rotation;

  // Calculate the center of the image
  const rect = element.getBoundingClientRect(element);
  const { clientWidth: width, clientHeight: height } = element;

  const { scale, translation } = viewport;
  const centerPoints = {
    x: rect.left + width / 2 + translation.x * scale,
    y: rect.top + height / 2 + translation.y * scale,
  };

  const angleInfo = angleBetweenPoints(
    centerPoints,
    startPoints.client,
    currentPoints.client
  );

  angleInfo.angle *= rotateScale;

  if (roundAngles) {
    angleInfo.angle = Math.ceil(angleInfo.angle);
  }
  if (angleInfo.direction < 0) {
    angleInfo.angle = -angleInfo.angle;
  }

  viewport.rotation = initialRotation + angleInfo.angle;
}

function horizontalStrategy(evt) {
  const { roundAngles, flipHorizontal, rotateScale } = this.configuration;
  const { viewport, startPoints, currentPoints } = evt.detail;
  const initialRotation = viewport.initialRotation;
  const initialPointX = startPoints.client.x;
  const currentPointX = currentPoints.client.x;

  let angle = (currentPointX - initialPointX) * rotateScale;

  if (roundAngles) {
    angle = Math.round(Math.abs(angle)) * (angle > 0 ? 1 : -1);
  }
  if (flipHorizontal) {
    angle = -angle;
  }

  viewport.rotation = initialRotation + angle;
}

function verticalStrategy(evt) {
  const { roundAngles, flipVertical, rotateScale } = this.configuration;
  const { viewport, startPoints, currentPoints } = evt.detail;
  const initialRotation = viewport.initialRotation;
  const initialPointY = startPoints.client.y;
  const currentPointY = currentPoints.client.y;

  let angle = (currentPointY - initialPointY) * rotateScale;

  if (roundAngles) {
    angle = Math.round(Math.abs(angle)) * (angle > 0 ? 1 : -1);
  }
  if (flipVertical) {
    angle = -angle;
  }

  viewport.rotation = initialRotation + angle;
}
