import { getLabelmap3D } from './getLabelmaps3D';
import external from '../../../externalModules';
import { getDiffBetweenPixelData } from '../../../util/segmentation';
import { pushState, undo, redo } from './history';

let mockLabelmap3D;
const mockElement = {};

jest.mock('./getLabelmaps3D', () => ({
  getLabelmap3D: (element, labelmapIndex) => mockLabelmap3D,
}));

jest.mock('../../../externalModules.js', () => ({
  cornerstone: {
    updateImage: jest.fn(),
    triggerEvent: jest.fn(),
  },
}));

describe('history.js', () => {
  beforeEach(() => {
    resetLabelmap3D();
  });

  describe('pushState', () => {
    it("Should push the applied operation to the Labelmap3D's undo stack.", () => {
      const labelmap3D = getLabelmap3D();
      const frames = [0];
      const data = [{ segmentIndex: 1, pixels: [0] }];
      const operations = emulateSegmentationToolApplication(frames, data);

      pushState(mockElement, operations);

      expect(labelmap3D.undo.length).toBe(1);
    });

    it("Should push a set of simulataneous operations to multiple frames to the Labelmap3D's undo stack as one entry.", () => {
      const labelmap3D = getLabelmap3D();
      const frames = [4, 5, 6];
      const data = [
        { segmentIndex: 1, pixels: [0] },
        { segmentIndex: 1, pixels: [0] },
        { segmentIndex: 1, pixels: [0] },
      ];
      const operations = emulateSegmentationToolApplication(frames, data);

      pushState(mockElement, operations);

      expect(labelmap3D.undo.length).toBe(1);
      expect(labelmap3D.undo[0].length).toBe(3);
    });

    it("Should invalidate the Labelmap3D's redo stack when pushing new state.", () => {
      const labelmap3D = getLabelmap3D();
      const frames = [0];
      const data = [{ segmentIndex: 1, pixels: [0] }];
      const operations = emulateSegmentationToolApplication(frames, data);

      pushState(mockElement, operations);

      undo(mockElement);

      pushState(mockElement, operations);

      expect(labelmap3D.undo.length).toBe(1);
      expect(labelmap3D.redo.length).toBe(0);
    });
  });

  describe('undo', () => {
    it('Should undo an operation and have it pushed to the redo stack.', () => {
      const labelmap3D = getLabelmap3D();
      const frames = [0];
      const data = [{ segmentIndex: 1, pixels: [0] }];
      const operations = emulateSegmentationToolApplication(frames, data);

      pushState(mockElement, operations);

      undo(mockElement);

      expect(labelmap3D.undo.length).toBe(0);
      expect(labelmap3D.redo.length).toBe(1);
    });

    it('Should perform 1000 random operations to the labelmap, undo all the operations and return to a blank canvas.', () => {
      const labelmap3D = getLabelmap3D();

      function getRandomFrame() {
        return Math.floor(Math.random() * Math.floor(16));
      }

      function getRandomPixel() {
        return Math.floor(Math.random() * Math.floor(256));
      }

      function getRandomSegmentIndex() {
        // Including zero which is "erase"
        return Math.floor(Math.random() * Math.floor(65536));
      }

      const numberOfOperations = 1000;

      // Sample random operations and perform them.
      for (let i = 0; i < numberOfOperations; i++) {
        const frames = [getRandomFrame()];
        const data = [
          {
            segmentIndex: getRandomSegmentIndex(),
            pixels: [
              getRandomPixel(),
              getRandomPixel(),
              getRandomPixel(),
              getRandomPixel(),
            ],
          },
        ];
        const operations = emulateSegmentationToolApplication(frames, data);

        pushState(mockElement, operations);
      }

      while (labelmap3D.undo.length > 0) {
        undo(mockElement);
      }

      const uInt16ViewOfLabelmap3D = new Uint16Array(labelmap3D.buffer);
      const hasNonZeroElement = uInt16ViewOfLabelmap3D.some(
        voxel => voxel !== 0
      );

      expect(labelmap3D.undo.length).toBe(0);
      expect(labelmap3D.redo.length).toBe(numberOfOperations);
      expect(hasNonZeroElement).toBe(false);
    });
  });

  describe('redo', () => {
    it('Should undo an operation and redo it to get the same result.', () => {
      const labelmap3D = getLabelmap3D();
      const frames = [3, 4];
      const data = [
        { segmentIndex: 1, pixels: [0, 45, 234] },
        { segmentIndex: 1, pixels: [15, 23, 25] },
      ];
      const operations = emulateSegmentationToolApplication(frames, data);

      pushState(mockElement, operations);

      const copyOfStateAfterOperation = new Uint16Array(
        labelmap3D.buffer
      ).slice();

      undo(mockElement);

      redo(mockElement, operations);

      const viewOnBuffer = new Uint16Array(labelmap3D.buffer);

      let hasDifferentPixel = false;

      for (let i = 0; i < viewOnBuffer.length; i++) {
        if (viewOnBuffer[i] !== copyOfStateAfterOperation[i]) {
          hasDifferentPixel = true;
        }
      }

      expect(labelmap3D.undo.length).toBe(1);
      expect(labelmap3D.redo.length).toBe(0);
      expect(hasDifferentPixel).toBe(false);
    });
  });
});

function resetLabelmap3D() {
  const width = 16;
  const height = 16;
  const sliceLength = width * height;
  const numberOfFrames = 16;

  mockLabelmap3D = {
    buffer: new ArrayBuffer(width * height * numberOfFrames * 2),
    labelmaps2D: [],
    metadata: [],
    activeSegmentIndex: 1,
    colorLUTIndex: 0,
    segmentsHidden: [],
    undo: [],
    redo: [],
  };

  const labelmaps2D = mockLabelmap3D.labelmaps2D;
  const buffer = mockLabelmap3D.buffer;

  for (let imageIdIndex = 0; imageIdIndex < numberOfFrames; imageIdIndex++) {
    const byteOffset = sliceLength * 2 * imageIdIndex; // 2 bytes/pixel

    const pixelData = new Uint16Array(buffer, byteOffset, sliceLength);

    labelmaps2D.push({ pixelData, segmentsOnLabelmap: [] });
  }
}

function emulateSegmentationToolApplication(frames, data) {
  const labelmap3D = getLabelmap3D();
  const labelmaps2D = labelmap3D.labelmaps2D;

  const operations = [];

  for (let i = 0; i < frames.length; i++) {
    const imageIdIndex = frames[i];
    const { segmentIndex, pixels } = data[i];
    const { pixelData } = labelmaps2D[imageIdIndex];
    const previousPixelData = pixelData.slice();

    pixels.forEach(pixel => {
      pixelData[pixel] = segmentIndex;
    });

    operations.push({
      imageIdIndex,
      diff: getDiffBetweenPixelData(previousPixelData, pixelData),
    });
  }

  return operations;
}
