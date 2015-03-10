var cornerstoneTools = (function ($, cornerstone, cornerstoneTools) {

    "use strict";

    if(cornerstoneTools === undefined) {
        cornerstoneTools = {};
    }

    var toolType = "stackPrefetch";

    function prefetch(element)
    {
        var stackData = cornerstoneTools.getToolState(element, 'stack');
        if(stackData === undefined || stackData.data === undefined || stackData.data.length === 0) {
            return;
        }

        var stackPrefetchData = cornerstoneTools.getToolState(element, toolType);
        if(stackPrefetchData === undefined) {
            // should not happen
            return;
        }

        var stackPrefetch = stackPrefetchData.data[0];

        var stack = stackData.data[0];

        if(stackPrefetch.enabled === false) {
            return;
        }

        var stackPrefetchImageIdIndex = stackPrefetch.prefetchImageIdIndex + 1;
        stackPrefetchImageIdIndex = Math.min(stack.imageIds.length - 1, stackPrefetchImageIdIndex);
        stackPrefetchImageIdIndex = Math.max(0, stackPrefetchImageIdIndex);

        // if no change turn off prefetching for this stack
        if(stackPrefetchImageIdIndex === stackPrefetch.prefetchImageIdIndex)
        {
            stackPrefetch.enabled = false;
            return;
        }

        stackPrefetch.prefetchImageIdIndex = stackPrefetchImageIdIndex;

        var imageId = stack.imageIds[stackPrefetchImageIdIndex];

        var loadImageDeferred = cornerstone.loadAndCacheImage(imageId, element);

        loadImageDeferred.then(function(image)
        {
            // if we are no longer enabled, do not try to prefetch again
            if(stackPrefetch.enabled === false) {
                return;
            }

            // image has been loaded, call prefetch on the next image
            setTimeout(function() {
                prefetch(element);
            }, 1);
        });
    }

    function enable(element)
    {
        var stackPrefetchData = cornerstoneTools.getToolState(element, toolType);
        if(stackPrefetchData.data.length === 0) {
            var data = {
                prefetchImageIdIndex : 0,
                enabled: true
            };
            cornerstoneTools.addToolState(element, toolType, data);
        }

        prefetch(element);
    }

    function disable(element)
    {
        var stackPrefetchData = cornerstoneTools.getToolState(element, toolType);
        if(stackPrefetchData.data.length === 0) {
            var data = {
                prefetchImageIdIndex : 0,
                enabled: false
            };

            cornerstoneTools.removeToolState(element, toolType, stackPrefetchData);

        }
        else
        {
            stackPrefetchData.data[0].enabled = false;
        }
    }

    // module/private exports
    cornerstoneTools.stackPrefetch = {
        enable: enable,
        disable: disable
        };

    return cornerstoneTools;
}($, cornerstone, cornerstoneTools));
