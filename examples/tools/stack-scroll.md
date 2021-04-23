---
layout: stack-tool
title: Stack Scroll Tool
toolName: StackScroll
toolType: stack
---


<h2 class="title is-2">How to set up the StackScroll tool:</h2>

{% highlight javascript %}
// Init cornerstone tools
cornerstoneTools.init()

const scheme = 'wadouri'
const baseUrl = 'https://mypacs.com/dicoms/'
const series = [
    'image_1.dcm',
    'image_2.dcm'
]

const imageIds = series.map(seriesImage => `${scheme}:${baseUrl}${seriesImage}`)

// Add our tool, and set it's mode
const StackScrollTool = cornerstoneTools.StackScrollTool

//define the stack
const stack = {
  currentImageIdIndex: 0,
  imageIds: imageIds
}

// load images and set the stack
cornerstone.loadImage(imageIds[0]).then((image) => {
  cornerstone.displayImage(element, image)
  cornerstoneTools.addStackStateManager(element, ['stack'])
  cornerstoneTools.addToolState(element, 'stack', stack)
})

cornerstoneTools.addTool(StackScrollTool)
cornerstoneTools.setToolActive('StackScroll', { mouseButtonMask: 1 })

{% endhighlight %}
