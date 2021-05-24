import RotateTool from './RotateTool.js';
import external from './../externalModules.js';

jest.mock('./../externalModules.js', () => ({
  cornerstone: {},
}));

const mockEvt = {
  detail: {
    viewport: {
      rotation: 0,
    },
  },
};

const forMobileMockEvt = {
  detail: {
    viewport: {
      rotation: 50,
      initialRotation: undefined,
    },
  },
};

describe('RotateTool.js', () => {
  describe('default values', () => {
    it('has a default name of "Rotate"', () => {
      const defaultName = 'Rotate';
      const instantiatedTool = new RotateTool();

      expect(instantiatedTool.name).toEqual(defaultName);
    });

    it('can be created with a custom tool name', () => {
      const customToolName = { name: 'customToolName' };
      const instantiatedTool = new RotateTool(customToolName);

      expect(instantiatedTool.name).toEqual(customToolName.name);
    });
  });
  describe('postMouseDownCallback', () => {
    it('should set initialRotation once mouse is click', () => {
      const instantiatedTool = new RotateTool();

      instantiatedTool.postMouseDownCallback(mockEvt);
      expect(instantiatedTool.initialRotation).toBe(0);
    });
  });

  describe('dragCallback', () => {
    it('should call setViewport once drag event is done', () => {
      const instantiatedTool = new RotateTool();

      instantiatedTool.applyActiveStrategy = jest.fn();
      external.cornerstone.setViewport = jest.fn();

      instantiatedTool.dragCallback(mockEvt);
      expect(external.cornerstone.setViewport).toHaveBeenCalled();
    });

    it('can be created on mobile device', () => {
      const instantiatedTool = new RotateTool();

      instantiatedTool.applyActiveStrategy = jest.fn();
      external.cornerstone.setViewport = jest.fn();

      instantiatedTool.dragCallback(forMobileMockEvt);
      expect(external.cornerstone.setViewport).toHaveBeenCalled();
    });
  });
});
