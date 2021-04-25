import ProbeTool from './ProbeTool.js';
import { getToolState } from '../../stateManagement/toolState.js';
import { getLogger } from '../../util/logger.js';

jest.mock('../../util/logger.js');
jest.mock('../../stateManagement/toolState.js', () => ({
  getToolState: jest.fn(),
}));

jest.mock('./../../externalModules.js', () => ({
  cornerstone: {
    metaData: {
      get: jest.fn(),
    },
    getStoredPixels: (element, x, y) => {
      /* eslint-disable prettier/prettier */
      const storedPixels = [10, 20, 30, 40, 50, 60, 70, 80, 90];
      /* eslint-enable prettier/prettier */

      return [storedPixels[x * 2 + y]];
    },
  },
}));

const badMouseEventData = 'hello world';
const goodMouseEventData = {
  currentPoints: {
    image: {
      x: 0,
      y: 0,
    },
  },
};

const image = {
  rows: 3,
  columns: 3,
  slope: 1,
  intercept: 1,
  color: false,
};

describe('ProbeTool.js', () => {
  describe('default values', () => {
    it('has a default name of "Probe"', () => {
      const defaultName = 'Probe';
      const instantiatedTool = new ProbeTool();

      expect(instantiatedTool.name).toEqual(defaultName);
    });

    it('can be created with a custom tool name', () => {
      const customToolName = { name: 'customToolName' };
      const instantiatedTool = new ProbeTool(customToolName);

      expect(instantiatedTool.name).toEqual(customToolName.name);
    });

    it('can be created with a custom buildStatsStr callback', () => {
      const customToolName = { configuration: { buildStatsStr: () => 'TEST' } };
      const instantiatedTool = new ProbeTool(customToolName);

      expect(instantiatedTool.configuration.buildStatsStr()).toEqual('TEST');
    });
  });

  describe('createNewMeasurement', () => {
    it('emits console error if required eventData is not provided', () => {
      const logger = getLogger();
      const instantiatedTool = new ProbeTool();

      const d = instantiatedTool.createNewMeasurement(badMouseEventData);

      expect(d).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain(
        'required eventData not supplied to tool'
      );
    });

    // Todo: create a more formal definition of a tool measurement object
    it('returns a tool measurement object', () => {
      const instantiatedTool = new ProbeTool();

      const toolMeasurement = instantiatedTool.createNewMeasurement(
        goodMouseEventData
      );

      expect(typeof toolMeasurement).toBe(typeof {});
    });

    it("returns a measurement with an end handle at the eventData's x and y and an undefined start", () => {
      const instantiatedTool = new ProbeTool();

      const toolMeasurement = instantiatedTool.createNewMeasurement(
        goodMouseEventData
      );
      const endHandle = {
        x: toolMeasurement.handles.end.x,
        y: toolMeasurement.handles.end.y,
      };

      expect(toolMeasurement.handles.start).toBeUndefined();
      expect(endHandle.x).toBe(goodMouseEventData.currentPoints.image.x);
      expect(endHandle.y).toBe(goodMouseEventData.currentPoints.image.y);
    });
  });

  describe('pointNearTool', () => {
    let element, coords;

    beforeEach(() => {
      element = jest.fn();
      coords = jest.fn();
    });

    // Todo: Not sure we want all of our methods to check for valid params.
    it('emits a console warning when measurementData without start/end handles are supplied', () => {
      const logger = getLogger();

      const instantiatedTool = new ProbeTool();
      const noHandlesMeasurementData = {
        handles: {},
      };

      instantiatedTool.pointNearTool(element, noHandlesMeasurementData, coords);

      expect(logger.warn).toHaveBeenCalled();
      expect(logger.warn.mock.calls[0][0]).toContain('invalid parameters');
    });

    it('returns false when measurement data is null or undefined', () => {
      const instantiatedTool = new ProbeTool();
      const nullMeasurementData = null;

      const isPointNearTool = instantiatedTool.pointNearTool(
        element,
        nullMeasurementData,
        coords
      );

      expect(isPointNearTool).toBe(false);
    });

    it('returns false when measurement data is not visible', () => {
      const instantiatedTool = new ProbeTool();
      const notVisibleMeasurementData = {
        visible: false,
      };

      const isPointNearTool = instantiatedTool.pointNearTool(
        element,
        notVisibleMeasurementData,
        coords
      );

      expect(isPointNearTool).toBe(false);
    });
  });

  describe('updateCachedStats', () => {
    let element;

    beforeEach(() => {
      element = jest.fn();
    });

    it('should calculate and update annotation values', () => {
      const instantiatedTool = new ProbeTool();

      const data = {
        handles: {
          end: {
            x: 0,
            y: 0,
          },
        },
      };

      instantiatedTool.updateCachedStats(image, element, data);
      expect(data.cachedStats.x).toEqual(0);
      expect(data.cachedStats.y).toEqual(0);
      expect(data.cachedStats.mo).toEqual(11);
      expect(data.cachedStats.sp).toEqual(10);

      data.handles.end.x = 2;
      data.handles.end.y = 2;

      instantiatedTool.updateCachedStats(image, element, data);
      expect(data.cachedStats.x).toEqual(2);
      expect(data.cachedStats.y).toEqual(2);
      expect(data.cachedStats.mo).toEqual(71);
      expect(data.cachedStats.sp).toEqual(70);
    });
  });

  describe('renderToolData', () => {
    it('returns undefined when no toolData exists for the tool', () => {
      const instantiatedTool = new ProbeTool();
      const mockEvent = {
        detail: undefined,
        currentTarget: undefined,
      };

      getToolState.mockReturnValueOnce(undefined);

      const renderResult = instantiatedTool.renderToolData(mockEvent);

      expect(renderResult).toBe(undefined);
    });
  });
});
