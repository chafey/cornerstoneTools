import EVENTS from '../events.js';
import external from '../externalModules.js';
import copyPoints from '../util/copyPoints.js';
import preventGhostClick from './preventGhostClick.js';
import triggerEvent from '../util/triggerEvent.js';
import {
  setToolOptions,
  getToolOptions,
  clearToolOptions,
} from '../toolOptions.js';

let startPoints,
  currentPoints,
  lastPoints,
  deltaPoints,
  eventData,
  touchStartDelay,
  pressTimeout,
  pageDistanceMoved;

let lastScale = 1.0,
  lastRotation = 0.0,
  preventNextPinch = false,
  isPress = false,
  lastDelta;

const pressDelay = 700,
  pressMaxDistance = 5;

const inputName = 'touchInput';

function onTouch(e) {
  const element = e.currentTarget || e.srcEvent.currentTarget;
  const enabledElement = external.cornerstone.getEnabledElement(element);

  if (!enabledElement.image) {
    return;
  }

  let eventType, scaleChange, delta, remainingPointers, rotation;

  // Prevent mouse events from occurring alongside touch events
  e.preventDefault();

  // If more than one finger is placed on the element, stop the press timeout
  if (
    (e.pointers && e.pointers.length > 1) ||
    (e.touches && e.touches.length > 1)
  ) {
    isPress = false;
    clearTimeout(pressTimeout);
  }

  switch (e.type) {
    case 'tap':
      isPress = false;
      clearTimeout(pressTimeout);

      // Calculate our current points in page and image coordinates
      currentPoints = {
        page: external.cornerstoneMath.point.pageToPoint(e.pointers[0]),
        image: external.cornerstone.pageToPixel(
          element,
          e.pointers[0].pageX,
          e.pointers[0].pageY
        ),
        client: {
          x: e.pointers[0].clientX,
          y: e.pointers[0].clientY,
        },
      };
      currentPoints.canvas = external.cornerstone.pixelToCanvas(
        element,
        currentPoints.image
      );

      eventType = EVENTS.TAP;
      eventData = {
        event: e,
        viewport: external.cornerstone.getViewport(element),
        image: enabledElement.image,
        element,
        currentPoints,
        type: eventType,
        isTouchEvent: true,
      };

      triggerEvent(element, eventType, eventData);
      break;

    case 'doubletap':
      isPress = false;
      clearTimeout(pressTimeout);

      // Calculate our current points in page and image coordinates
      currentPoints = {
        page: external.cornerstoneMath.point.pageToPoint(e.pointers[0]),
        image: external.cornerstone.pageToPixel(
          element,
          e.pointers[0].pageX,
          e.pointers[0].pageY
        ),
        client: {
          x: e.pointers[0].clientX,
          y: e.pointers[0].clientY,
        },
      };
      currentPoints.canvas = external.cornerstone.pixelToCanvas(
        element,
        currentPoints.image
      );

      eventType = EVENTS.DOUBLE_TAP;
      eventData = {
        event: e,
        viewport: external.cornerstone.getViewport(element),
        image: enabledElement.image,
        element,
        currentPoints,
        type: eventType,
        isTouchEvent: true,
      };

      triggerEvent(element, eventType, eventData);
      break;

    case 'pinchstart':
      isPress = false;
      clearTimeout(pressTimeout);

      lastScale = 1.0;
      break;

    case 'pinchmove':
      isPress = false;
      clearTimeout(pressTimeout);

      if (preventNextPinch === true) {
        lastScale = e.scale;
        preventNextPinch = false;
        break;
      }

      scaleChange = (e.scale - lastScale) / lastScale;

      startPoints = {
        page: e.center,
        image: external.cornerstone.pageToPixel(
          element,
          e.center.x,
          e.center.y
        ),
      };
      startPoints.canvas = external.cornerstone.pixelToCanvas(
        element,
        startPoints.image
      );

      eventType = EVENTS.TOUCH_PINCH;
      eventData = {
        event: e,
        startPoints,
        viewport: external.cornerstone.getViewport(element),
        image: enabledElement.image,
        element,
        direction: e.scale < 1 ? 1 : -1,
        scaleChange,
        type: eventType,
        isTouchEvent: true,
      };

      triggerEvent(element, eventType, eventData);

      lastScale = e.scale;
      break;

    case 'touchstart':
      lastScale = 1.0;

      clearTimeout(pressTimeout);

      clearTimeout(touchStartDelay);
      touchStartDelay = setTimeout(function() {
        startPoints = {
          page: external.cornerstoneMath.point.pageToPoint(e.touches[0]),
          image: external.cornerstone.pageToPixel(
            element,
            e.touches[0].pageX,
            e.touches[0].pageY
          ),
          client: {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          },
        };
        startPoints.canvas = external.cornerstone.pixelToCanvas(
          element,
          startPoints.image
        );

        eventType = EVENTS.TOUCH_START;
        if (e.touches.length > 1) {
          eventType = EVENTS.MULTI_TOUCH_START;
        }

        eventData = {
          event: e,
          viewport: external.cornerstone.getViewport(element),
          image: enabledElement.image,
          element,
          startPoints,
          currentPoints: startPoints,
          type: eventType,
          isTouchEvent: true,
        };

        const eventPropagated = triggerEvent(element, eventType, eventData);

        if (eventPropagated === true) {
          // IsPress = false;
          // ClearTimeout(pressTimeout);

          // No current tools responded to the drag action.
          // Create new tool measurement
          eventType = EVENTS.TOUCH_START_ACTIVE;
          if (e.touches.length > 1) {
            eventType = EVENTS.MULTI_TOUCH_START_ACTIVE;
          }

          eventData.type = eventType;
          triggerEvent(element, eventType, eventData);
        }

        // Console.log(eventType);
        lastPoints = copyPoints(startPoints);
      }, 50);

      isPress = true;
      pageDistanceMoved = 0;
      pressTimeout = setTimeout(function() {
        if (!isPress) {
          return;
        }

        currentPoints = {
          page: external.cornerstoneMath.point.pageToPoint(e.touches[0]),
          image: external.cornerstone.pageToPixel(
            element,
            e.touches[0].pageX,
            e.touches[0].pageY
          ),
          client: {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          },
        };
        currentPoints.canvas = external.cornerstone.pixelToCanvas(
          element,
          startPoints.image
        );

        eventType = EVENTS.TOUCH_PRESS;
        eventData = {
          event: e,
          viewport: external.cornerstone.getViewport(element),
          image: enabledElement.image,
          element,
          currentPoints,
          type: eventType,
          isTouchEvent: true,
        };

        triggerEvent(element, eventType, eventData);

        // Console.log(eventType);
      }, pressDelay);
      break;

    case 'touchend':
      lastScale = 1.0;

      isPress = false;
      clearTimeout(pressTimeout);

      setTimeout(function() {
        startPoints = {
          page: external.cornerstoneMath.point.pageToPoint(e.changedTouches[0]),
          image: external.cornerstone.pageToPixel(
            element,
            e.changedTouches[0].pageX,
            e.changedTouches[0].pageY
          ),
          client: {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY,
          },
        };
        startPoints.canvas = external.cornerstone.pixelToCanvas(
          element,
          startPoints.image
        );

        eventType = EVENTS.TOUCH_END;

        eventData = {
          event: e,
          viewport: external.cornerstone.getViewport(element),
          image: enabledElement.image,
          element,
          startPoints,
          currentPoints: startPoints,
          type: eventType,
          isTouchEvent: true,
        };

        triggerEvent(element, eventType, eventData);
      }, 50);
      break;

    case 'panmove':
      // Using the delta-value of HammerJS, because it takes all pointers into account
      // This is very important when using panning in combination with pinch-zooming
      // But HammerJS' delta is relative to the start of the pan event
      // So it needs to be converted to a per-event-delta for CornerstoneTools
      delta = {
        x: e.deltaX - lastDelta.x,
        y: e.deltaY - lastDelta.y,
      };

      lastDelta = {
        x: e.deltaX,
        y: e.deltaY,
      };

      // Calculate our current points in page and image coordinates
      currentPoints = {
        page: {
          x: lastPoints.page.x + delta.x,
          y: lastPoints.page.y + delta.y,
        },
        image: external.cornerstone.pageToPixel(
          element,
          lastPoints.page.x + delta.x,
          lastPoints.page.y + delta.y
        ),
        client: {
          x: lastPoints.client.x + delta.x,
          y: lastPoints.client.y + delta.y,
        },
      };
      currentPoints.canvas = external.cornerstone.pixelToCanvas(
        element,
        currentPoints.image
      );

      // Calculate delta values in page and image coordinates
      deltaPoints = {
        page: external.cornerstoneMath.point.subtract(
          currentPoints.page,
          lastPoints.page
        ),
        image: external.cornerstoneMath.point.subtract(
          currentPoints.image,
          lastPoints.image
        ),
        client: external.cornerstoneMath.point.subtract(
          currentPoints.client,
          lastPoints.client
        ),
        canvas: external.cornerstoneMath.point.subtract(
          currentPoints.canvas,
          lastPoints.canvas
        ),
      };

      pageDistanceMoved += Math.sqrt(
        deltaPoints.page.x * deltaPoints.page.x +
          deltaPoints.page.y * deltaPoints.page.y
      );
      // Console.log("pageDistanceMoved: " + pageDistanceMoved);
      if (pageDistanceMoved > pressMaxDistance) {
        // Console.log('Press event aborted due to movement');
        isPress = false;
        clearTimeout(pressTimeout);
      }

      eventType = EVENTS.TOUCH_DRAG;
      if (e.pointers.length > 1) {
        eventType = EVENTS.MULTI_TOUCH_DRAG;
      }

      eventData = {
        viewport: external.cornerstone.getViewport(element),
        image: enabledElement.image,
        element,
        startPoints,
        lastPoints,
        currentPoints,
        deltaPoints,
        numPointers: e.pointers.length,
        type: eventType,
        isTouchEvent: true,
      };

      triggerEvent(element, eventType, eventData);

      lastPoints = copyPoints(currentPoints);
      break;

    case 'panstart':
      lastDelta = {
        x: e.deltaX,
        y: e.deltaY,
      };

      currentPoints = {
        page: external.cornerstoneMath.point.pageToPoint(e.pointers[0]),
        image: external.cornerstone.pageToPixel(
          element,
          e.pointers[0].pageX,
          e.pointers[0].pageY
        ),
        client: {
          x: e.pointers[0].clientX,
          y: e.pointers[0].clientY,
        },
      };
      currentPoints.canvas = external.cornerstone.pixelToCanvas(
        element,
        currentPoints.image
      );
      lastPoints = copyPoints(currentPoints);
      break;

    case 'panend':
      isPress = false;
      clearTimeout(pressTimeout);

      // If lastPoints is not yet set, it means panend fired without panstart or pan,
      // So we can ignore this event
      if (!lastPoints) {
        return false;
      }

      currentPoints = {
        page: external.cornerstoneMath.point.pageToPoint(e.pointers[0]),
        image: external.cornerstone.pageToPixel(
          element,
          e.pointers[0].pageX,
          e.pointers[0].pageY
        ),
        client: {
          x: e.pointers[0].clientX,
          y: e.pointers[0].clientY,
        },
      };
      currentPoints.canvas = external.cornerstone.pixelToCanvas(
        element,
        currentPoints.image
      );

      // Calculate delta values in page and image coordinates
      deltaPoints = {
        page: external.cornerstoneMath.point.subtract(
          currentPoints.page,
          lastPoints.page
        ),
        image: external.cornerstoneMath.point.subtract(
          currentPoints.image,
          lastPoints.image
        ),
        client: external.cornerstoneMath.point.subtract(
          currentPoints.client,
          lastPoints.client
        ),
        canvas: external.cornerstoneMath.point.subtract(
          currentPoints.canvas,
          lastPoints.canvas
        ),
      };

      eventType = EVENTS.TOUCH_DRAG_END;

      eventData = {
        event: e.srcEvent,
        viewport: external.cornerstone.getViewport(element),
        image: enabledElement.image,
        element,
        startPoints,
        lastPoints,
        currentPoints,
        deltaPoints,
        type: eventType,
        isTouchEvent: true,
      };

      triggerEvent(element, eventType, eventData);

      remainingPointers = e.pointers.length - e.changedPointers.length;

      if (remainingPointers === 2) {
        preventNextPinch = true;
      }
      break;

    case 'rotatemove':
      isPress = false;
      clearTimeout(pressTimeout);

      rotation = e.rotation - lastRotation;

      lastRotation = e.rotation;

      eventType = EVENTS.TOUCH_ROTATE;
      eventData = {
        event: e.srcEvent,
        viewport: external.cornerstone.getViewport(element),
        image: enabledElement.image,
        element,
        rotation,
        type: eventType,
      };
      triggerEvent(element, eventType, eventData);
      break;
  }

  return false;
}

function enable(element) {
  disable(element);
  const Hammer = external.Hammer;

  const hammerOptions = {
    inputClass: Hammer.SUPPORT_POINTER_EVENTS
      ? Hammer.PointerEventInput
      : Hammer.TouchInput,
  };

  const mc = new Hammer.Manager(element, hammerOptions);

  const panOptions = {
    pointers: 0,
    direction: Hammer.DIRECTION_ALL,
    threshold: 0,
  };

  const pan = new Hammer.Pan(panOptions);
  const pinch = new Hammer.Pinch({
    threshold: 0,
  });
  const rotate = new Hammer.Rotate({
    threshold: 0,
  });

  pinch.recognizeWith(pan);
  pinch.recognizeWith(rotate);
  rotate.recognizeWith(pan);

  const doubleTap = new Hammer.Tap({
    event: 'doubletap',
    taps: 2,
    interval: 1500,
    threshold: 50,
    posThreshold: 50,
  });

  doubleTap.recognizeWith(pan);

  // Add to the Manager
  mc.add([doubleTap, pan, rotate, pinch]);
  mc.on(
    'tap doubletap panstart panmove panend pinchstart pinchmove rotatemove',
    onTouch
  );

  preventGhostClick.enable(element);

  const touchEvents = ['touchstart', 'touchend'];

  touchEvents.forEach(eventType => {
    element.addEventListener(eventType, onTouch, { passive: false });
  });

  // TODO: Check why we are using tool options if it's not a tool
  const options = getToolOptions(inputName, element);

  options.hammer = mc;

  // TODO: Check why we are using tool options if it's not a tool
  setToolOptions(inputName, element, options);
}

function disable(element) {
  preventGhostClick.disable(element);

  const touchEvents = ['touchstart', 'touchend'];

  touchEvents.forEach(eventType => {
    element.removeEventListener(eventType, onTouch);
  });

  // TODO: Check why we are using tool options if it's not a tool
  const options = getToolOptions(inputName, element);
  const mc = options.hammer;

  if (mc) {
    mc.off(
      'tap doubletap panstart panmove panend pinchstart pinchmove rotatemove',
      onTouch
    );
    mc.input.destroy();
  }
  options.hammer = null;
  clearToolOptions(inputName, element);
}

// Module exports
const touchInput = {
  enable,
  disable,
};

export default touchInput;
