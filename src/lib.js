import BaseTool from './tools/base/BaseTool.js';
import BaseAnnotationTool from './tools/base/BaseAnnotationTool.js';
import BaseBrushTool from './tools/base/BaseBrushTool.js';

import {
  anyHandlesOutsideImage,
  getHandleNearImagePoint,
  getHandlePixelPosition,
  handleActivator,
  moveHandle,
  moveAllHandles,
  moveNewHandle,
} from './manipulators/index.js';

import {
  moveHandleNearImagePoint,
  findHandleDataNearImagePoint,
  moveAnnotation,
} from './util/findAndMoveHelpers.js';

import mixins from './mixins/index.js';
import * as cursors from './tools/cursors/index.js';

import {
  getNewContext,
  draw,
  path,
  setShadow,
  drawLine,
  drawLines,
  drawJoinedLines,
  drawCircle,
  drawEllipse,
  drawRect,
  fillOutsideRect,
  fillBox,
  fillTextLines,
} from './drawing/index.js';
import { clip, clipToBox } from './util/clip.js';
import debounce from './util/debounce';
import deepmerge from './util/deepmerge';
import getDefault from './util/getDefault';
import getPixelSpacing from './util/getPixelSpacing';
import isEmptyObject from './util/isEmptyObject';
import isObject from './util/isObject';
import isPointInImage from './util/isPointInImage';
import isPointInPolygon from './util/isPointInPolygon';
import throttle from './util/throttle';
import { wait, waitForEnabledElementImageToLoad } from './util/wait';
import getKeyPressData from './util/getKeyPressData';

import drawTextBox, { textBoxWidth } from './drawing/drawTextBox.js';
import drawArrow from './drawing/drawArrow.js';
import drawLink from './drawing/drawLink.js';
import drawLinkedTextBox from './drawing/drawLinkedTextBox.js';
import drawHandles from './drawing/drawHandles.js';

import getLuminance from './util/getLuminance.js';
import getROITextBoxCoords from './util/getROITextBoxCoords';
import copyPoints from './util/copyPoints.js';
import calculateSUV from './util/calculateSUV.js';
import setContextToDisplayFontSize from './util/setContextToDisplayFontSize.js';
import scrollToIndex from './util/scrollToIndex.js';
import scroll from './util/scroll.js';
import roundToDecimal from './util/roundToDecimal.js';
import {
  projectPatientPointToImagePlane,
  imagePointToPatientPoint,
  planePlaneIntersection,
} from './util/pointProjector.js';
import lineSegDistance from './util/lineSegDistance.js';
import { getLogger } from './util/logger';

import pointInsideBoundingBox from './util/pointInsideBoundingBox.js';
import makeUnselectable from './util/makeUnselectable.js';
import getRGBPixels from './util/getRGBPixels.js';
import {
  getDefaultSimultaneousRequests,
  getMaxSimultaneousRequests,
  getBrowserInfo,
  isMobileDevice,
} from './util/getMaxSimultaneousRequests.js';
import angleBetweenPoints from './util/angleBetweenPoints.js';
import numbersWithCommas from './util/numbersWithCommas.js';
import MouseCursor from './tools/cursors/MouseCursor.js';

import ellipseUtils from './util/ellipse/index.js';
import freehandUtils from './util/freehand/index.js';
import * as segmentationUtils from './util/segmentation';
import zoomUtils from './util/zoom/index.js';
import triggerEvent from './util/triggerEvent.js';
import convertToVector3 from './util/convertToVector3.js';

export const lib = {
  'base/BaseTool': BaseTool,
  'base/BaseAnnotationTool': BaseAnnotationTool,
  'base/BaseBrushTool': BaseBrushTool,

  'tools/cursors/MouseCursor': MouseCursor,
  'tools/cursors': cursors,

  'manipulators/anyHandlesOutsideImage': anyHandlesOutsideImage,
  'manipulators/getHandleNearImagePoint': getHandleNearImagePoint,
  'manipulators/getHandlePixelPosition': getHandlePixelPosition,
  'manipulators/handleActivator': handleActivator,
  'manipulators/moveAllHandles': moveAllHandles,
  'manipulators/moveHandle': moveHandle,
  'manipulators/moveNewHandle': moveNewHandle,
  'manipulators/moveHandleNearImagePoint': moveHandleNearImagePoint,
  'manipulators/findHandleDataNearImagePoint': findHandleDataNearImagePoint,
  'manipulators/moveAnnotation': moveAnnotation,

  'mixins/activeOrDisabledBinaryTool': mixins.activeOrDisabledBinaryTool,
  'mixins/enabledOrDisabledBinaryTool': mixins.enabledOrDisabledBinaryTool,

  'drawing/getNewContext': getNewContext,
  'drawing/draw': draw,
  'drawing/path': path,
  'drawing/setShadow': setShadow,
  'drawing/drawLine': drawLine,
  'drawing/drawLines': drawLines,
  'drawing/drawJoinedLines': drawJoinedLines,
  'drawing/drawCircle': drawCircle,
  'drawing/drawEllipse': drawEllipse,
  'drawing/drawRect': drawRect,
  'drawing/fillOutsideRect': fillOutsideRect,
  'drawing/drawTextBox': drawTextBox,
  'drawing/drawArrow': drawArrow,
  'drawing/fillBox': fillBox,
  'drawing/fillTextLines': fillTextLines,
  'drawing/drawLink': drawLink,
  'drawing/drawLinkedTextBox': drawLinkedTextBox,
  'drawing/drawHandles': drawHandles,
  'drawing/textBoxWidth': textBoxWidth,

  'util/getLuminance': getLuminance,
  'util/getROITextBoxCoords': getROITextBoxCoords,
  'util/copyPoints': copyPoints,
  'util/calculateSUV': calculateSUV,
  'util/setContextToDisplayFontSize': setContextToDisplayFontSize,
  'util/scrollToIndex': scrollToIndex,
  'util/scroll': scroll,
  'util/roundToDecimal': roundToDecimal,
  'util/projectPatientPointToImagePlane': projectPatientPointToImagePlane,
  'util/imagePointToPatientPoint': imagePointToPatientPoint,
  'util/planePlaneIntersection': planePlaneIntersection,
  'util/pointInsideBoundingBox': pointInsideBoundingBox,
  'util/makeUnselectable': makeUnselectable,
  'util/getRGBPixels': getRGBPixels,
  'util/getDefaultSimultaneousRequests': getDefaultSimultaneousRequests,
  'util/getMaxSimultaneousRequests': getMaxSimultaneousRequests,
  'util/getBrowserInfo': getBrowserInfo,
  'util/isMobileDevice': isMobileDevice,
  'util/angleBetweenPoints': angleBetweenPoints,
  'util/numbersWithCommas': numbersWithCommas,
  'util/lineSegDistance': lineSegDistance,
  'util/triggerEvent': triggerEvent,
  'util/convertToVector3': convertToVector3,
  'util/clip': clip,
  'util/clipToBox': clipToBox,
  'util/debounce': debounce,
  'util/deepmerge': deepmerge,
  'util/getDefault': getDefault,
  'util/getPixelSpacing': getPixelSpacing,
  'util/isEmptyObject': isEmptyObject,
  'util/isObject': isObject,
  'util/isPointInImage': isPointInImage,
  'util/isPointInPolygon': isPointInPolygon,
  'util/getLogger': getLogger,
  'util/throttle': throttle,
  'util/wait': wait,
  'util/waitForEnabledElementImageToLoad': waitForEnabledElementImageToLoad,
  'util/getKeyPressData': getKeyPressData,

  // Whole tool specific util packages
  'util/ellipseUtils': ellipseUtils,
  'util/freehandUtils': freehandUtils,
  'util/segmentationUtils': segmentationUtils,
  'util/zoomUtils': zoomUtils,
};
