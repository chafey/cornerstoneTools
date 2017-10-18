import { cornerstone } from '../externalModules.js';
import toolStyle from '../stateManagement/toolStyle.js';

const defaultHandleRadius = 6;

export default function (context, renderData, handles, color, options) {
  context.strokeStyle = color;

  Object.keys(handles).forEach(function (name) {
    const handle = handles[name];
    let handleRadius = defaultHandleRadius;

    if (handle.drawnIndependently === true) {
      return;
    }

    if (options && options.drawHandlesIfActive === true && !handle.active) {
      return;
    }

    if (options && options.handleRadius !== undefined) {
      handleRadius = options.handleRadius;
    }

    context.beginPath();

    if (handle.active) {
      context.lineWidth = toolStyle.getActiveWidth();
    } else {
      context.lineWidth = toolStyle.getToolWidth();
    }

    const handleCanvasCoords = cornerstone.pixelToCanvas(renderData.element, handle);

    context.arc(handleCanvasCoords.x, handleCanvasCoords.y, handleRadius, 0, 2 * Math.PI);

    if (options && options.fill) {
      context.fillStyle = options.fill;
      context.fill();
    }

    context.stroke();
  });
}
