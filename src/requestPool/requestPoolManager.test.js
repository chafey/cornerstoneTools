// SUT
import requestPoolManager from './requestPoolManager.js';

jest.mock('./../externalModules.js');

describe('clearRequestStack with an invalid type', function() {
  it('should throw an error when attempting to clear the request stack with an invalid type', () => {
    const nonExistantType = 'NotAnExistingType';

    expect(() => requestPoolManager.clearRequestStack(nonExistantType)).toThrow(
      'Request type must be one of interaction, thumbnail, prefetch, or custom'
    );
  });
});

describe('addRequest', function() {
  it('should add the requests to the interaction stack, in the correct order', function() {
    requestPoolManager.addRequest(
      {},
      'request1',
      'interaction',
      false,
      () => {}, // DoneCallback
      () => {} // FailCallback
    );
    requestPoolManager.addRequest(
      {},
      'request2',
      'interaction',
      false,
      () => {}, // DoneCallback
      () => {} // FailCallback
    );
    requestPoolManager.addRequest(
      {},
      'request3',
      'interaction',
      false,
      () => {}, // DoneCallback
      () => {}, // FailCallback
      true
    );

    const interactionStack = requestPoolManager.getRequestPool().interaction;

    expect(interactionStack[0].imageId).toEqual('request3');
    expect(interactionStack[1].imageId).toEqual('request1');
    expect(interactionStack[2].imageId).toEqual('request2');
  });
});

describe('customRequest', function() {
  it('should be defined with custom priority', function() {
    const requestDetails = [
      {},
      'request1',
      'custom',
      false,
      () => {}, // DoneCallback
      () => {}, // FailCallback,
      {},
    ];

    expect(() => requestPoolManager.addRequest(...requestDetails)).toThrow(
      'Request priority should be defined if using a custom type'
    );
  });
});
