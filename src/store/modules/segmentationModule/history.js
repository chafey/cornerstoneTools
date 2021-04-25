import { getLabelmap3D } from './getLabelmaps3D';
import { getLogger } from '../../../util/logger';
import { triggerLabelmapModifiedEvent } from '../../../util/segmentation';
import { getActiveLabelmapIndex } from './activeLabelmapIndex';
import getSegmentsOnPixelData from './getSegmentsOnPixeldata';
import external from '../../../externalModules';

const logger = getLogger('util:segmentation:labelmap3DHistory');

function pushState(element, operations, labelmapIndex) {
  const labelmap3D = getLabelmap3D(element, labelmapIndex);

  labelmap3D.undo.push(operations);
  labelmap3D.redo = [];
}

function undo(element, labelmapIndex) {
  const activeLabelmapIndex = labelmapIndex
    ? labelmapIndex
    : getActiveLabelmapIndex(element);
  const labelmap3D = getLabelmap3D(element, activeLabelmapIndex);
  const { undo, redo } = labelmap3D;

  if (!undo.length) {
    logger.warn('No undos left.');

    return;
  }

  // Pop last set of operations from undo.
  const operations = undo.pop();

  // Undo operations.
  applyState(labelmap3D, operations, 1);

  // Push set of operations to redo.
  redo.push(operations);

  triggerLabelmapModifiedEvent(element, activeLabelmapIndex);
  external.cornerstone.updateImage(element);
}

function redo(element, labelmapIndex) {
  const activeLabelmapIndex = labelmapIndex
    ? labelmapIndex
    : getActiveLabelmapIndex(element);
  const labelmap3D = getLabelmap3D(element, activeLabelmapIndex);
  const { undo, redo } = labelmap3D;

  if (!redo.length) {
    logger.warn('No redos left.');

    return;
  }

  // Pop last set of operations from redo.
  const operations = redo.pop();

  // Redo operations.
  applyState(labelmap3D, operations, 2);

  // Push set of operations to undo.
  undo.push(operations);

  triggerLabelmapModifiedEvent(element, activeLabelmapIndex);
  external.cornerstone.updateImage(element);
}

export { pushState, undo, redo };

function applyState(labelmap3D, operations, replaceIndex) {
  const { labelmaps2D } = labelmap3D;

  operations.forEach(operation => {
    const { imageIdIndex, diff } = operation;
    const labelmap2D = labelmaps2D[imageIdIndex];
    const pixelData = labelmap2D.pixelData;

    for (let i = 0; i < diff.length; i++) {
      const diffI = diff[i];

      pixelData[diffI[0]] = diffI[replaceIndex];
    }

    labelmap2D.segmentsOnLabelmap = getSegmentsOnPixelData(pixelData);
  });
}
