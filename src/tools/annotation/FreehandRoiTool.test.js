import FreehandRoiTool from './FreehandRoiTool.js';
import freehandUtils from '../../util/freehand/index.js';
import { getLogger } from '../../util/logger.js';

const {
  calculateFreehandStatistics,
  freehandArea,
  freehandIntersect,
  pointInFreehand,
  FreehandHandleData,
} = freehandUtils;

jest.mock('../../util/logger.js');
jest.mock('./../../stateManagement/toolState.js', () => ({
  getToolState: jest.fn(),
}));

jest.mock('./../../importInternal.js', () => ({
  default: jest.fn(),
}));

jest.mock('./../../externalModules.js', () => ({
  cornerstone: {
    metaData: {
      get: type => {
        if (type === 'imagePlaneModule') {
          return {
            rowPixelSpacing: 2,
            columnPixelSpacing: 2,
          };
        }

        return {};
      },
    },
    getPixels: () => [100, 100, 100, 100, 4, 5, 100, 3, 6],
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

describe('FreehandRoiTool.js', function() {
  describe('default values', () => {
    it('has a default name of "FreehandRoi"', () => {
      const defaultName = 'FreehandRoi';
      const instantiatedTool = new FreehandRoiTool();

      expect(instantiatedTool.name).toEqual(defaultName);
    });

    it('can be created with a custom tool name', () => {
      const customToolName = { name: 'customToolName' };
      const instantiatedTool = new FreehandRoiTool(customToolName);

      expect(instantiatedTool.name).toEqual(customToolName.name);
    });
  });

  describe('createNewMeasurement', () => {
    it('emits console error if required eventData is not provided', () => {
      const instantiatedTool = new FreehandRoiTool();
      const logger = getLogger();

      instantiatedTool.createNewMeasurement(badMouseEventData);

      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain(
        'required eventData not supplied to tool'
      );
    });

    // Todo: create a more formal definition of a tool measurement object
    it('returns a tool measurement object', () => {
      const instantiatedTool = new FreehandRoiTool();

      const toolMeasurement = instantiatedTool.createNewMeasurement(
        goodMouseEventData
      );

      expect(typeof toolMeasurement).toBe(typeof {});
    });

    it('returns a measurement with a textBox handle', () => {
      const instantiatedTool = new FreehandRoiTool();

      const toolMeasurement = instantiatedTool.createNewMeasurement(
        goodMouseEventData
      );

      expect(typeof toolMeasurement.handles.textBox).toBe(typeof {});
    });
  });
});

describe('freehandIntersect.js', function() {
  let dataHandles;

  beforeEach(() => {
    // First 3 corners of a square.
    dataHandles = [
      new FreehandHandleData({
        x: 0.0,
        y: 0.0,
      }),
      new FreehandHandleData({
        x: 0.0,
        y: 1.0,
      }),
      new FreehandHandleData({
        x: 1.0,
        y: 1.0,
      }),
    ];
  });

  it('should return true if a new handle crosses any previous line', function() {
    const candidateHandle = new FreehandHandleData({
      x: -0.5,
      y: 0.5,
    });
    const doesIntersect = freehandIntersect.newHandle(
      candidateHandle,
      dataHandles
    );

    expect(doesIntersect).toBeTruthy();
  });

  it("should return false if a new handle doesn't cross any previous line", function() {
    const candidateHandle = new FreehandHandleData({
      x: 0.5,
      y: 0.5,
    });
    const doesIntersect = freehandIntersect.newHandle(
      candidateHandle,
      dataHandles
    );

    expect(doesIntersect).toBeDefined();
    expect(doesIntersect).toBeFalsy();
  });

  it('should return true if the line created by finishing the polygon crosses any previous line', function() {
    // Add an additional handle above the triangle such the line (handle3,handle0) crosses (handle1,handle2).
    const handle3 = new FreehandHandleData({
      x: 0.5,
      y: 1.5,
    });

    dataHandles.push(handle3);

    const doesIntersect = freehandIntersect.end(dataHandles);

    expect(doesIntersect).toBeTruthy();
  });

  it("should return false if the line created by finishing the polygon doesn't cross any previous line", function() {
    const doesIntersect = freehandIntersect.end(dataHandles);

    expect(doesIntersect).toBeDefined();
    expect(doesIntersect).toBeFalsy();
  });

  it("should return true if one moves a polygon's vertex such that it causes an lines to cross", function() {
    // Add the 4th corner of the square first.
    const handle3 = new FreehandHandleData({
      x: 1.0,
      y: 0.0,
    });

    dataHandles.push(handle3);

    // Move handle2 so that it crosses line (handle0,handle1)
    const modifiedHandleId = 2;

    dataHandles[modifiedHandleId].x = -0.5;
    dataHandles[modifiedHandleId].y = 0.5;

    const doesIntersect = freehandIntersect.modify(
      dataHandles,
      modifiedHandleId
    );

    expect(doesIntersect).toBeTruthy();
  });

  it("should return false if one moves a polygon's vertex a bit such that no lines cross", function() {
    // Add the 4th corner of the square first.
    const handle3 = new FreehandHandleData({
      x: 1.0,
      y: 0.0,
    });

    dataHandles.push(handle3);

    // Move handle2 in a non disruptive way.
    const modifiedHandleId = 2;

    dataHandles[modifiedHandleId].x = 2.0;
    dataHandles[modifiedHandleId].y = 2.0;

    const doesIntersect = freehandIntersect.modify(
      dataHandles,
      modifiedHandleId
    );

    expect(doesIntersect).toBeDefined();
    expect(doesIntersect).toBeFalsy();
  });
});

describe('pointInFreehand.js', function() {
  // Simple square
  const dataHandles = [
    new FreehandHandleData({
      x: 0.0,
      y: 0.0,
    }),
    new FreehandHandleData({
      x: 0.0,
      y: 1.0,
    }),
    new FreehandHandleData({
      x: 1.0,
      y: 1.0,
    }),
    new FreehandHandleData({
      x: 1.0,
      y: 0.0,
    }),
  ];

  it('should return true if the point is inside the polygon', function() {
    const point = {
      x: 0.5,
      y: 0.5,
    };
    const isInside = pointInFreehand(dataHandles, point);

    expect(isInside).toBeTruthy();
  });

  it('should return false if the point is outside the object, to the right', function() {
    const point = {
      x: 2.0,
      y: 0.5,
    };
    const isInside = pointInFreehand(dataHandles, point);

    expect(isInside).toBeDefined();
    expect(isInside).toBeFalsy();
  });

  it('should return false if the point is outside the object, to the left', function() {
    const point = {
      x: -1.0,
      y: 0.5,
    };
    const isInside = pointInFreehand(dataHandles, point);

    expect(isInside).toBeDefined();
    expect(isInside).toBeFalsy();
  });

  it('should return false if on the line exactly', function() {
    const point = {
      x: 1.0,
      y: 0.5,
    };
    const isInside = pointInFreehand(dataHandles, point);

    expect(isInside).toBeDefined();
    expect(isInside).toBeFalsy();
  });

  it('should return false if the point is outside the object, above or bellow', function() {
    const point1 = {
      x: 0.5,
      y: 2.0,
    };
    const point2 = {
      x: 0.5,
      y: -1.0,
    };
    const isInside1 = pointInFreehand(dataHandles, point1);
    const isInside2 = pointInFreehand(dataHandles, point2);

    expect(isInside1).toBeDefined();
    expect(isInside1).toBeFalsy();
    expect(isInside2).toBeDefined();
    expect(isInside2).toBeFalsy();
  });
});

describe('freehandArea.js', function() {
  // A unit square
  const dataHandles = [
    new FreehandHandleData({
      x: 0.0,
      y: 0.0,
    }),
    new FreehandHandleData({
      x: 0.0,
      y: 1.0,
    }),
    new FreehandHandleData({
      x: 1.0,
      y: 1.0,
    }),
    new FreehandHandleData({
      x: 1.0,
      y: 0.0,
    }),
  ];

  it('should return the area enclosed in dataHandles', function() {
    const area = freehandArea(dataHandles, false);

    expect(area).toBeCloseTo(1.0, 5);
  });

  it('should scale if a scale parameter is given.', function() {
    const area = freehandArea(dataHandles, 10.0);

    expect(area).toBeCloseTo(10.0, 5);
  });
});

describe('calculateFreehandStatistics.js', function() {
  // 'L' shape: 10x10 square with top right quadrant missing
  const dataHandles = [
    new FreehandHandleData({
      x: 0.0,
      y: 0.0,
    }),
    new FreehandHandleData({
      x: 0.0,
      y: 10.0,
    }),
    new FreehandHandleData({
      x: 5.0,
      y: 10.0,
    }),
    new FreehandHandleData({
      x: 5.0,
      y: 5.0,
    }),
    new FreehandHandleData({
      x: 10.0,
      y: 5.0,
    }),
    new FreehandHandleData({
      x: 10.0,
      y: 0.0,
    }),
  ];

  const boundingBox = {
    top: 0.0,
    height: 10.0,
    left: 0.0,
    width: 10.0,
  };

  it('should not include pixels outside the polygon', function() {
    // Create 100 dimensional pixel array
    const pixels = [];

    pixels.length = 100;
    pixels.fill(0.0);

    // Set a pixel outside the polygon to a high value;
    pixels[78] = 1000.0;

    const statisticsObj = calculateFreehandStatistics(
      pixels,
      boundingBox,
      dataHandles
    );

    expect(statisticsObj.mean).toBeCloseTo(0.0, 5);
    expect(statisticsObj.variance).toBeCloseTo(0.0, 5);
    expect(statisticsObj.stdDev).toBeCloseTo(0.0, 5);
  });

  it('should calculate that statistics of pixels within the polygon', function() {
    // Create 100 dimensional pixel array
    const pixels = [];

    pixels.length = 100;

    // Set pixels within (0,0),(0,5),(10,5),(10,0) to 1
    for (let i = 0; i < 50; i++) {
      pixels[i] = 1.0;
    }
    // Set pixels within (0,5),(0,10),(10,10),(10,5) to 4
    for (let i = 50; i < 100; i++) {
      pixels[i] = 4.0;
    }

    const statisticsObj = calculateFreehandStatistics(
      pixels,
      boundingBox,
      dataHandles
    );

    expect(statisticsObj.mean).toBeCloseTo(2.0, 5);
    expect(statisticsObj.variance).toBeCloseTo(2.0, 5);
    expect(statisticsObj.stdDev).toBeCloseTo(Math.sqrt(2.0), 5);
  });
});

describe('updateCachedStats', () => {
  let element;

  beforeEach(() => {
    element = jest.fn();
  });

  it('should calculate and update annotation value using the metaData provider pixel spacing', () => {
    const instantiatedTool = new FreehandRoiTool();

    const data = {
      handles: {
        points: [
          {
            x: 0.0,
            y: 0.0,
          },
          {
            x: 0.0,
            y: 1.0,
          },
          {
            x: 1.0,
            y: 1.0,
          },
        ],
      },
    };

    const image = {
      rowPixelSpacing: 0.8984375,
      columnPixelSpacing: 0.8984375,
    };

    instantiatedTool.updateCachedStats(image, element, data);
    expect(data.area).toBe(2);
  });
});
