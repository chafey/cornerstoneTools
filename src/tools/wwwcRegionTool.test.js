import WwwcRegionTool from './wwwcRegionTool.js';

jest.mock('./../util/drawing.js', () => ({
  draw: jest.fn(),
  drawRect: jest.fn(),
  getNewContext: jest.fn()
}));
jest.mock('./../externalModules.js', () => ({
  cornerstone: {
    colors: {
      getColormap: jest.fn().mockImplementation(() => {
        return {
          setNumberOfColors: jest.fn(),
          setColor: jest.fn()
        }
      })
    }
  }
}));

describe('wwwcRegionTool.js', () => {
  describe('default values', () => {
    it('has a default name of "wwwcRegion"', () => {
      const defaultName = 'wwwcRegion';
      const instantiatedTool = new WwwcRegionTool();

      expect(instantiatedTool.name).toEqual(defaultName);
    });

    it('can be created with a custom tool name', () => {
      const customToolName = 'customToolName';
      const instantiatedTool = new WwwcRegionTool(customToolName);

      expect(instantiatedTool.name).toEqual(customToolName);
    });

    it('sets a default configuration with an minWindowWidth of 10', () => {
      const instantiatedTool = new WwwcRegionTool();

      expect(instantiatedTool.configuration.minWindowWidth).toBe(10);
    });

    it('sets a default handles with and empty object for each start and end', () => {
      const instantiatedTool = new WwwcRegionTool();

      expect(instantiatedTool.handles.start).toMatchObject({});
      expect(instantiatedTool.handles.end).toMatchObject({});
    });
  });
});
