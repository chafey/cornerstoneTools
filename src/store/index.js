// Modules
import segmentation from './modules/segmentationModule';
import manipulatorState from './modules/manipulatorStateModule';
import cursor from './modules/cursorModule.js';
import globalConfiguration from './modules/globalConfigurationModule.js';
import external from '../externalModules.js';
import { getLogger } from '../util/logger.js';

const logger = getLogger('store:modules:storeLogger');

export const state = {
  // Global
  globalTools: {},
  globalToolChangeHistory: [],
  // Tracking
  enabledElements: [],
  tools: [],
  isToolLocked: false,
  activeMultiPartTool: null,
  mousePositionImage: {},
  // Settings
  clickProximity: 6,
  touchProximity: 10,
  handleRadius: 6,
  deleteIfHandleOutsideImage: true,
  preventHandleOutsideImage: false,
  preventTextBoxOutsideDisplayedArea: false,
  // Cursor
  svgCursorUrl: null,
  //
};

export const getters = {
  mouseTools: () =>
    state.tools.filter(tool =>
      tool.supportedInteractionTypes.includes('Mouse')
    ),
  touchTools: () =>
    state.tools.filter(tool =>
      tool.supportedInteractionTypes.includes('Touch')
    ),
  enabledElementByUID: enabledElementUID =>
    state.enabledElements.find(
      element =>
        external.cornerstone.getEnabledElement(element).uuid ===
        enabledElementUID
    ),
};

export const modules = {
  segmentation,
  cursor,
  globalConfiguration,
  manipulatorState,
};

export function getModule(moduleName) {
  return modules[moduleName];
}

export default {
  modules,
  state,
  getters,
};
