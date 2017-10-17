import { $, getCornerstone } from '../externalModules.js';
import requestPoolManager from '../requestPool/requestPoolManager.js';
import loadHandlerManager from '../stateManagement/loadHandlerManager.js';
import { addToolState, getToolState } from '../stateManagement/toolState.js';
import { setMaxSimultaneousRequests } from '../util/getMaxSimultaneousRequests.js';

const toolType = 'stackPrefetch';
const requestType = 'prefetch';

let configuration = {};

let resetPrefetchTimeout;
const resetPrefetchDelay = 300;

function range (lowEnd, highEnd) {
    // Javascript version of Python's range function
    // http://stackoverflow.com/questions/3895478/does-javascript-have-a-method-like-range-to-generate-an-array-based-on-suppl
  lowEnd = Math.round(lowEnd) || 0;
  highEnd = Math.round(highEnd) || 0;

  const arr = [];
  let c = highEnd - lowEnd + 1;

  if (c <= 0) {
    return arr;
  }

  while (c--) {
    arr[c] = highEnd--;
  }

  return arr;
}

const max = function (arr) {
  return Math.max.apply(null, arr);
};

const min = function (arr) {
  return Math.min.apply(null, arr);
};

function nearestIndex (arr, x) {
    // Return index of nearest values in array
    // http://stackoverflow.com/questions/25854212/return-index-of-nearest-values-in-an-array
  const l = [];
  const h = [];

  arr.forEach(function (v) {
    if (v < x) {
      l.push(v);
    } else if (v > x) {
      h.push(v);
    }
  });

  return {
    low: arr.indexOf(max(l)),
    high: arr.indexOf(min(h))
  };
}

function prefetch (element) {
    // Check to make sure stack data exists
  const stackData = getToolState(element, 'stack');

  if (!stackData || !stackData.data || !stackData.data.length) {
    return;
  }

  const stack = stackData.data[0];

    // Get the stackPrefetch tool data
  const stackPrefetchData = getToolState(element, toolType);

  if (!stackPrefetchData) {
    return;
  }

  const stackPrefetch = stackPrefetchData.data[0] || {};

    // If all the requests are complete, disable the stackPrefetch tool
  if (!stackPrefetch.indicesToRequest || !stackPrefetch.indicesToRequest.length) {
    stackPrefetch.enabled = false;
  }

    // Make sure the tool is still enabled
  if (stackPrefetch.enabled === false) {
    return;
  }

    // Remove an imageIdIndex from the list of indices to request
    // This fires when the individual image loading deferred is resolved
  function removeFromList (imageIdIndex) {
    const index = stackPrefetch.indicesToRequest.indexOf(imageIdIndex);

    if (index > -1) { // Don't remove last element if imageIdIndex not found
      stackPrefetch.indicesToRequest.splice(index, 1);
    }
  }

    // Remove all already cached images from the
    // IndicesToRequest array
  stackPrefetchData.data[0].indicesToRequest.sort((a, b) => (a - b));
  const indicesToRequestCopy = stackPrefetch.indicesToRequest.slice();

  indicesToRequestCopy.forEach(function (imageIdIndex) {
    const imageId = stack.imageIds[imageIdIndex];

    if (!imageId) {
      return;
    }

    const imagePromise = getCornerstone().imageCache.getImagePromise(imageId);

    if (imagePromise && imagePromise.state() === 'resolved') {
      removeFromList(imageIdIndex);
    }
  });

    // Stop here if there are no images left to request
    // After those in the cache have been removed
  if (!stackPrefetch.indicesToRequest.length) {
    return;
  }

    // Clear the requestPool of prefetch requests
  requestPoolManager.clearRequestStack(requestType);

    // Identify the nearest imageIdIndex to the currentImageIdIndex
  const nearest = nearestIndex(stackPrefetch.indicesToRequest, stack.currentImageIdIndex);

  let imageId;
  let nextImageIdIndex;
  const preventCache = false;

  function doneCallback (image) {
        // Console.log('prefetch done: ' + image.imageId);
    const imageIdIndex = stack.imageIds.indexOf(image.imageId);

    removeFromList(imageIdIndex);
  }

    // Retrieve the errorLoadingHandler if one exists
  const errorLoadingHandler = loadHandlerManager.getErrorLoadingHandler();

  function failCallback (error) {
    console.log(`prefetch errored: ${error}`);
    if (errorLoadingHandler) {
      errorLoadingHandler(element, imageId, error, 'stackPrefetch');
    }
  }

    // Prefetch images around the current image (before and after)
  let lowerIndex = nearest.low;
  let higherIndex = nearest.high;

  while (lowerIndex > 0 || higherIndex < stackPrefetch.indicesToRequest.length) {
    if (lowerIndex >= 0) {
      nextImageIdIndex = stackPrefetch.indicesToRequest[lowerIndex--];
      imageId = stack.imageIds[nextImageIdIndex];
      requestPoolManager.addRequest(element, imageId, requestType, preventCache, doneCallback, failCallback);
    }

    if (higherIndex < stackPrefetch.indicesToRequest.length) {
      nextImageIdIndex = stackPrefetch.indicesToRequest[higherIndex++];
      imageId = stack.imageIds[nextImageIdIndex];
      requestPoolManager.addRequest(element, imageId, requestType, preventCache, doneCallback, failCallback);
    }
  }

    // Try to start the requestPool's grabbing procedure
    // In case it isn't already running
  requestPoolManager.startGrabbing();
}

function promiseRemovedHandler (e, eventData) {
    // When an imagePromise has been pushed out of the cache, re-add its index
    // It to the indicesToRequest list so that it will be retrieved later if the
    // CurrentImageIdIndex is changed to an image nearby
  const element = e.data.element;
  let stackData;

  try {
        // It will throw an exception in some cases (eg: thumbnails)
    stackData = getToolState(element, 'stack');
  } catch(error) {
    return;
  }

  if (!stackData || !stackData.data || !stackData.data.length) {
    return;
  }

  const stack = stackData.data[0];
  const imageIdIndex = stack.imageIds.indexOf(eventData.imageId);

    // Make sure the image that was removed is actually in this stack
    // Before adding it to the indicesToRequest array
  if (imageIdIndex < 0) {
    return;
  }

  const stackPrefetchData = getToolState(element, toolType);

  if (!stackPrefetchData || !stackPrefetchData.data || !stackPrefetchData.data.length) {
    return;
  }

  stackPrefetchData.data[0].indicesToRequest.push(imageIdIndex);
}

function onImageUpdated (e) {
    // Start prefetching again (after a delay)
    // When the user has scrolled to a new image
  clearTimeout(resetPrefetchTimeout);
  resetPrefetchTimeout = setTimeout(function () {
    const element = e.target;

        // If playClip is enabled and the user loads a different series in the viewport
        // An exception will be thrown because the element will not be enabled anymore
    try {
      prefetch(element);
    } catch(error) {
      return;
    }

  }, resetPrefetchDelay);
}

function enable (element) {
  const cornerstone = getCornerstone();
    // Clear old prefetch data. Skipping this can cause problems when changing the series inside an element
  const stackPrefetchDataArray = getToolState(element, toolType);

  stackPrefetchDataArray.data = [];

    // First check that there is stack data available
  const stackData = getToolState(element, 'stack');

  if (!stackData || !stackData.data || !stackData.data.length) {
    return;
  }

  const stack = stackData.data[0];

    // Check if we are allowed to cache images in this stack
  if (stack.preventCache === true) {
    console.warn('A stack that should not be cached was given the stackPrefetch');

    return;
  }

    // Use the currentImageIdIndex from the stack as the initalImageIdIndex
  const stackPrefetchData = {
    indicesToRequest: range(0, stack.imageIds.length - 1),
    enabled: true,
    direction: 1
  };

    // Remove the currentImageIdIndex from the list to request
  const indexOfCurrentImage = stackPrefetchData.indicesToRequest.indexOf(stack.currentImageIdIndex);

  stackPrefetchData.indicesToRequest.splice(indexOfCurrentImage, 1);

  addToolState(element, toolType, stackPrefetchData);

  prefetch(element);

  $(element).off('CornerstoneNewImage', onImageUpdated);
  $(element).on('CornerstoneNewImage', onImageUpdated);

  $(cornerstone.events).off('CornerstoneImageCachePromiseRemoved', promiseRemovedHandler);
  $(cornerstone.events).on('CornerstoneImageCachePromiseRemoved', {
    element
  }, promiseRemovedHandler);
}

function disable (element) {
  clearTimeout(resetPrefetchTimeout);
  $(element).off('CornerstoneNewImage', onImageUpdated);

  $(getCornerstone().events).off('CornerstoneImageCachePromiseRemoved', promiseRemovedHandler);

  const stackPrefetchData = getToolState(element, toolType);
    // If there is actually something to disable, disable it

  if (stackPrefetchData && stackPrefetchData.data.length) {
    stackPrefetchData.data[0].enabled = false;

        // Clear current prefetch requests from the requestPool
    requestPoolManager.clearRequestStack(requestType);
  }
}

function getConfiguration () {
  return configuration;
}

function setConfiguration (config) {
  configuration = config;

  if (config.maxSimultaneousRequests) {
    setMaxSimultaneousRequests(config.maxSimultaneousRequests);
  }
}

// Module/private exports
const stackPrefetch = {
  enable,
  disable,
  getConfiguration,
  setConfiguration
};

export default stackPrefetch;
