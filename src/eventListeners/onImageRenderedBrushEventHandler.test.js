import { getModule } from '../store/index.js';
import onImageRenderedBrushEventHandler from './onImageRenderedBrushEventHandler.js';
import { addToolState } from '../stateManagement/toolState';
import externalModules from '../externalModules.js';
import triggerEvent from '../util/triggerEvent.js';
import getLabelmaps3D from '../store/modules/segmentationModule/getLabelmaps3D.js';

const segmentationModule = getModule('segmentation');
const { configuration, state } = segmentationModule;

jest.mock('./../externalModules.js');
jest.mock('./internals/renderSegmentation.js');
jest.mock('../util/triggerEvent.js');
jest.mock('../store/modules/segmentationModule/getLabelmaps3D.js');

const width = 256;
const imageId = 'image1';
let evt;

function addMocks(testElement) {
  externalModules.cornerstone.getEnabledElement.mockImplementationOnce(
    () => testElement
  );
  triggerEvent.mockImplementationOnce(() => true);
  getLabelmaps3D.mockImplementationOnce(() => state.series[imageId]);
}

function createLabelMap(length, currentImageIdIndex) {
  let labelmap3D = {
    buffer: new ArrayBuffer(length * 2),
    labelmaps2D: [],
    metadata: [],
    activeSegmentIndex: 0,
    segmentsHidden: [],
  };

  let labelmap2D = {
    pixelData: new Uint16Array(labelmap3D.buffer, 0, length),
    segmentsOnLabelmap: [0, 1, 2],
  };

  labelmap3D.labelmaps2D[currentImageIdIndex] = labelmap2D;

  return labelmap3D;
}

function setEventDetail() {
  let eventDetail = {
    element: null,
    image: {
      width: width,
      height: width,
    },
    viewport: {},
    canvasContext: {
      canvas: {
        width: 1.0 * width,
        height: 1.0 * width,
      },
    },
  };

  evt = {
    detail: eventDetail,
  };
}

function getLabelMapCollection(currentImageIdIndex) {
  const labelmaps3D = [];
  const eventData = evt.detail;
  const length = width * width;
  labelmaps3D.push(
    createLabelMap(eventData.image.width, length, currentImageIdIndex)
  );
  labelmaps3D.push(
    createLabelMap(eventData.image.width, length, currentImageIdIndex)
  );
  return labelmaps3D;
}

function initalize() {
  const currentImageIdIndex = 0;
  const testElement = {
    image: {
      imageId,
    },
  };

  addMocks(testElement);
  setEventDetail();

  const imageIds = [imageId];
  const stack = {
    currentImageIdIndex: 0,
    imageIds: imageIds,
  };

  state.series[imageId] = {
    activeLabelmapIndex: 0,
    labelmaps3D: getLabelMapCollection(currentImageIdIndex),
    currentImageIdIndex: currentImageIdIndex,
  };

  addToolState(testElement, 'stack', stack);
}

describe('onImageRenderedBrushEventHandler.js', () => {
  beforeEach(() => {
    initalize();
  });

  describe('renderInactiveLabelMaps', () => {
    it('Should keep fillAlphaInactive set directly', () => {
      configuration.fillAlphaPerLabelMap = {};
      configuration.fillAlphaInactive = 0.5;
      const outline = onImageRenderedBrushEventHandler(evt);

      expect(configuration.fillAlphaInactive).toBe(0.5);
    });
    it('Should update fillAlpha and fillAlphaInactive from fillAlphaPerLabelMap', () => {
      configuration.fillAlphaPerLabelMap['image1'] = [0.8, 0.9];
      configuration.fillAlpha = 0.2;
      configuration.fillAlphaInactive = 0.5;
      const outline = onImageRenderedBrushEventHandler(evt);

      expect(configuration.fillAlpha).toBe(0.8);
      expect(configuration.fillAlphaInactive).toBe(0.9);
    });
  });
  describe('renderActiveLabelMap', () => {
    it('Should keep fillAlpha set directly', () => {
      configuration.fillAlphaPerLabelMap = {};
      configuration.fillAlpha = 0.6;
      const outline = onImageRenderedBrushEventHandler(evt);

      expect(configuration.fillAlpha).toBe(0.6);
    });
    it('Should update fillAlpha and fillAlphaInactive from fillAlphaPerLabelMap', () => {
      configuration.fillAlphaPerLabelMap['image1'] = [0.4, 1.0];
      configuration.fillAlpha = 0.5;
      configuration.fillAlphaInactive = 0.6;
      const outline = onImageRenderedBrushEventHandler(evt);

      expect(configuration.fillAlpha).toBe(0.4);
      expect(configuration.fillAlphaInactive).toBe(1.0);
    });
  });
});
