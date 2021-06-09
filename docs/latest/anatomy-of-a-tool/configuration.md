## Configuration {#configuration}

While changing a Tool's [mode](index.md#modes), you also have the option of updating its internal configuration. While Tool configuration varies widely, there are a few commonly used configuration values. For example, all Tools that respond to `mouse input` use `mouseButtonMask` to determine which mouse button triggers their behavior. To better understand how configuration is applied, check out the below examples:

```js
// Set's the tool's configuration to `{ mouseButtonMask: 1 }`
cornerstoneTools.setToolActive('ToolName', { mouseButtonMask: 1 });

// Tool's options are left "as-is"
cornerstoneTools.setToolActive('ToolName');
cornerstoneTools.setToolActive('ToolName', null);
cornerstoneTools.setToolActive('ToolName', undefined);
cornerstoneTools.setToolActive('ToolName', {});

// A new key is added to the Tool's configuration
cornerstoneTools.setToolActive('ToolName', { isTouchActive: false });

//  The previous `mouseButtonMask` configuration property's value is updated to `2`
cornerstoneTools.setToolActive('ToolName', { mouseButtonMask: 2 });
```

### Common Configuration Options

> TODO: Create a property on [`BaseTool`](../tool-types/index.md#base-tool) that is a string list of all configuration options used internally by the tool? Then maintain a list here that denotes what each property is used for?

| Option                               | Mouse | Touch | Annotation | Brush |
| ------------------------------------ | :---: | :---: | :--------: | :---: |
| `mouseButtonMask`                    |   x   |       |            |       |
| `deleteIfHandleOutsideDisplayedArea` |       |       |     x      |       |
| `deleteIfHandleOutsideImage`         |       |       |     x      |       |
| `preventHandleOutsideDisplayedArea`  |       |       |     x      |       |
| `preventHandleOutsideImage`          |       |       |     x      |       |
| `isTouchActive`                      |       |   x   |            |       |
