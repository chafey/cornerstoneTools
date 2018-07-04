import external from '../externalModules.js';
import mouseButtonTool from './mouseButtonTool.js';
import touchTool from './touchTool.js';
import drawTextBox from '../util/drawTextBox.js';
import roundToDecimal from '../util/roundToDecimal.js';
import textStyle from '../stateManagement/textStyle.js';
import toolColors from '../stateManagement/toolColors.js';
import drawHandles from '../manipulators/drawHandles.js';
import { getToolState } from '../stateManagement/toolState.js';
import lineSegDistance from '../util/lineSegDistance.js';
import { getNewContext, draw, setShadow, drawJoinedLines } from '../util/drawing.js';

const toolType = 'angle';

// /////// BEGIN ACTIVE TOOL ///////
function createNewMeasurement (mouseEventData) {
  // Create the measurement data for this tool with the end handle activated
  const angleData = {
    visible: true,
    active: true,
    color: undefined,
    handles: {
      start: {
        x: mouseEventData.currentPoints.image.x - 20,
        y: mouseEventData.currentPoints.image.y + 10,
        highlight: true,
        active: false
      },
      end: {
        x: mouseEventData.currentPoints.image.x,
        y: mouseEventData.currentPoints.image.y,
        highlight: true,
        active: true
      },
      start2: {
        x: mouseEventData.currentPoints.image.x - 20,
        y: mouseEventData.currentPoints.image.y + 10,
        highlight: true,
        active: false
      },
      end2: {
        x: mouseEventData.currentPoints.image.x,
        y: mouseEventData.currentPoints.image.y + 20,
        highlight: true,
        active: false
      }
    }
  };

  return angleData;
}
// /////// END ACTIVE TOOL ///////

function pointNearTool (element, data, coords) {
  if (data.visible === false) {
    return false;
  }

  return lineSegDistance(element, data.handles.start, data.handles.end, coords) < 5 ||
    lineSegDistance(element, data.handles.start2, data.handles.end2, coords) < 5;
}

// /////// BEGIN IMAGE RENDERING ///////
function onImageRendered (e) {
  const eventData = e.detail;

  // If we have no toolData for this element, return immediately as there is nothing to do
  const toolData = getToolState(e.currentTarget, toolType);

  if (toolData === undefined) {
    return;
  }

  // We have tool data for this element - iterate over each one and draw it
  const context = getNewContext(eventData.canvasContext.canvas);

  const font = textStyle.getFont();
  const config = angle.getConfiguration();
  const cornerstone = external.cornerstone;

  for (let i = 0; i < toolData.data.length; i++) {
    const data = toolData.data[i];

    if (data.visible === false) {
      continue;
    }

    draw(context, (context) => {
      // Configurable shadow
      setShadow(context, config);

      // Differentiate the color of activation tool
      const color = toolColors.getColorIfActive(data);

      drawJoinedLines(context, eventData.element, data.handles.end, [data.handles.start, data.handles.end2], { color });

      // Draw the handles
      drawHandles(context, eventData, data.handles);

      // Draw the text
      context.fillStyle = color;

      // Need to work on correct angle to measure.  This is a cobb angle and we need to determine
      // Where lines cross to measure angle. For now it will show smallest angle.
      const dx1 = (Math.ceil(data.handles.start.x) - Math.ceil(data.handles.end.x)) * eventData.image.columnPixelSpacing;
      const dy1 = (Math.ceil(data.handles.start.y) - Math.ceil(data.handles.end.y)) * eventData.image.rowPixelSpacing;
      const dx2 = (Math.ceil(data.handles.start2.x) - Math.ceil(data.handles.end2.x)) * eventData.image.columnPixelSpacing;
      const dy2 = (Math.ceil(data.handles.start2.y) - Math.ceil(data.handles.end2.y)) * eventData.image.rowPixelSpacing;

      let angle = Math.acos(Math.abs(((dx1 * dx2) + (dy1 * dy2)) / (Math.sqrt((dx1 * dx1) + (dy1 * dy1)) * Math.sqrt((dx2 * dx2) + (dy2 * dy2)))));

      angle *= (180 / Math.PI);

      const rAngle = roundToDecimal(angle, 2);
      const str = '00B0'; // Degrees symbol
      const text = rAngle.toString() + String.fromCharCode(parseInt(str, 16));

      const handleStartCanvas = cornerstone.pixelToCanvas(eventData.element, data.handles.start2);
      const handleEndCanvas = cornerstone.pixelToCanvas(eventData.element, data.handles.end2);

      const textX = (handleStartCanvas.x + handleEndCanvas.x) / 2;
      const textY = (handleStartCanvas.y + handleEndCanvas.y) / 2;

      context.font = font;
      drawTextBox(context, text, textX, textY, color);
    });
  }
}
// /////// END IMAGE RENDERING ///////

// Module exports
const angle = mouseButtonTool({
  createNewMeasurement,
  onImageRendered,
  pointNearTool,
  toolType
});

const angleTouch = touchTool({
  createNewMeasurement,
  onImageRendered,
  pointNearTool,
  toolType
});

export {
  angle,
  angleTouch
};
