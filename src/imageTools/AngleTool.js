var cornerstoneTools = (function ($, cornerstone, cornerstoneMath, cornerstoneTools) {

    "use strict";

    if (cornerstoneTools === undefined) {
        cornerstoneTools = {};
    }

    var toolType = "angle";

    ///////// BEGIN ACTIVE TOOL ///////
    function createNewMeasurement(mouseEventData) {
        // create the measurement data for this tool with the end handle activated
        var angleData = {
            visible: true,
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
    ///////// END ACTIVE TOOL ///////

    function pointNearTool(data, coords) {

        var lineSegment = {
            start: data.handles.start,
            end: data.handles.end
        };
        var distance = cornerstoneMath.lineSegment.distanceToPoint(lineSegment, coords);
        if (distance < 5)
            return true;

        lineSegment.start = data.handles.start2;
        lineSegment.end = data.handles.end2;

        distance = cornerstoneMath.lineSegment.distanceToPoint(lineSegment, coords);
        return (distance < 5);
    }

    ///////// BEGIN IMAGE RENDERING ///////
    function onImageRendered(e) {

        // if we have no toolData for this element, return immediately as there is nothing to do
        var toolData = cornerstoneTools.getToolState(e.currentTarget, toolType);
        if (toolData === undefined) {
            return;
        }

        // we have tool data for this element - iterate over each one and draw it
        var renderData = e.originalEvent.detail;
        var context = renderData.canvasContext.canvas.getContext("2d");
        cornerstone.setToPixelCoordinateSystem(renderData.enabledElement, context);

        for (var i = 0; i < toolData.data.length; i++) {
            context.save();
            var data = toolData.data[i];

            // draw the line
            context.beginPath();
            context.strokeStyle = 'white';
            context.lineWidth = 1 / renderData.viewport.scale;
            context.moveTo(data.handles.start.x, data.handles.start.y);
            context.lineTo(data.handles.end.x, data.handles.end.y);
            context.moveTo(data.handles.start2.x, data.handles.start2.y);
            context.lineTo(data.handles.end2.x, data.handles.end2.y);
            context.stroke();

            // draw the handles
            context.beginPath();
            cornerstoneTools.drawHandles(context, renderData, data.handles);
            context.stroke();

            // Draw the text
            context.fillStyle = "white";

            // Need to work on correct angle to measure.  This is a cobb angle and we need to determine
            // where lines cross to measure angle. For now it will show smallest angle. 
            var dx1 = (data.handles.start.x - data.handles.end.x) * renderData.image.columnPixelSpacing;
            var dy1 = (data.handles.start.y - data.handles.end.y) * renderData.image.rowPixelSpacing;
            var dx2 = (data.handles.start2.x - data.handles.end2.x) * renderData.image.columnPixelSpacing;
            var dy2 = (data.handles.start2.y - data.handles.end2.y) * renderData.image.rowPixelSpacing;

            var angle = Math.acos(Math.abs(((dx1 * dx2) + (dy1 * dy2)) / (Math.sqrt((dx1 * dx1) + (dy1 * dy1)) * Math.sqrt((dx2 * dx2) + (dy2 * dy2)))));
            angle = angle * (180 / Math.PI);

            var rAngle = cornerstoneTools.roundToDecimal(angle, 2);
            var str = "00B0"; // degrees symbol
            var text = rAngle.toString() + String.fromCharCode(parseInt(str, 16));

            var fontParameters = cornerstoneTools.setContextToDisplayFontSize(renderData.enabledElement, renderData.canvasContext, 15);
            context.font = "" + fontParameters.fontSize + "px Arial";

            var textX = (data.handles.start2.x + data.handles.end2.x) / 2 / fontParameters.fontScale;
            var textY = (data.handles.start2.y + data.handles.end2.y) / 2 / fontParameters.fontScale;
            context.fillText(text, textX, textY);
            context.restore();
        }

    }
    ///////// END IMAGE RENDERING ///////


    // module exports
    cornerstoneTools.angle = cornerstoneTools.mouseButtonTool({
        createNewMeasurement: createNewMeasurement,
        onImageRendered: onImageRendered,
        pointNearTool: pointNearTool,
        toolType: toolType
    });

    return cornerstoneTools;
} ($, cornerstone, cornerstoneMath, cornerstoneTools));