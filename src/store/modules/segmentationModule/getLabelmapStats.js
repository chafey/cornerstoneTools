import getElement from './getElement';
import { getToolState } from '../../../stateManagement/toolState.js';
import state from './state';
import external from '../../../externalModules';

import { getLogger } from '../../../util/logger';

const logger = getLogger('store:modules:segmentationModule:getLabelmapStats');

/**
 * Returns the maximum pixel value, mean and standard deviation of the segment
 * given by the `segmentIndex` and `labelmapIndex`.
 *
 * @param  {HTMLElement|string} elementOrEnabledElementUID   The cornerstone enabled
 *                                                    element or its UUID.
 * @param  {number} segmentIndex  The segment index to query.
 * @param  {number} labelmapIndex The `labelmapIndex` of the `Labelmap3D` to query.
 *                                Defaults to the activeLabelmapIndex if not given.
 * @returns {Promise|null} A promise that resolves to an object containing
 *                    the maximum pixel value, the mean and the standard deviation.
 *                    Returns null if no cornerstone element is found.
 */
export default function getLabelmapStats(
  elementOrEnabledElementUID,
  segmentIndex,
  labelmapIndex
) {
  const cornerstone = external.cornerstone;
  const element = getElement(elementOrEnabledElementUID);

  if (!element) {
    return null;
  }

  const stackState = getToolState(element, 'stack');
  const imageIds = stackState.data[0].imageIds;
  const firstImageId = imageIds[0];

  return new Promise(resolve => {
    const brushStackState = state.series[firstImageId];

    if (!brushStackState) {
      resolve(null);
    }

    labelmapIndex =
      labelmapIndex === undefined
        ? brushStackState.activeLabelmapIndex
        : labelmapIndex;

    const labelmap3D = brushStackState.labelmaps3D[labelmapIndex];

    const imagePromises = [];

    for (let i = 0; i < imageIds.length; i++) {
      imagePromises.push(cornerstone.loadAndCacheImage(imageIds[i]));
    }

    Promise.all(imagePromises).then(images => {
      let stats;
      const { sufficientMetadata, imagePlanes } = _getImagePlanes(imageIds);

      if (sufficientMetadata) {
        stats = _calculateLabelmapStats(
          labelmap3D,
          images,
          imagePlanes,
          segmentIndex
        );
      } else {
        logger.warn(
          'Insufficient imagePlaneModule information to calculate volume statistics.'
        );
      }
      resolve(stats);
    });
  });
}

/**
 *
 * @param {string[]} imageIds An array of cornerstone imageIds.
 * @returns {Object} An object containing an array of per-frame imagePlane metadata,
 * and a flag indicating if the metadata was present.
 */
function _getImagePlanes(imageIds) {
  const imagePlanes = [];
  const cornerstone = external.cornerstone;
  const metadataProvider = cornerstone.metaData;

  let sufficientMetadata = true;

  for (let i = 0; i < imageIds.length; i++) {
    const imagePlaneModule = metadataProvider.get(
      'imagePlaneModule',
      imageIds[i]
    );

    if (!imagePlaneModule) {
      sufficientMetadata = false;
      break;
    }

    imagePlanes.push(imagePlaneModule);
  }

  return { sufficientMetadata, imagePlanes };
}

/**
 *
 * @param {Labelmap3D} labelmap3D The labelmap3D object.
 * @param {Object[]} images An array of cornerstone images.
 * @param {Object[]} imagePlanes An array of the per-frame imagePlane metadata.
 * @param {number} segmentIndex
 *
 * @returns {Object} Statistics object containing the volume in mm^3; and the
 *                   min, max, mean and stdev of the segmented voxels.
 */
export function _calculateLabelmapStats(
  labelmap3D,
  images,
  imagePlanes,
  segmentIndex
) {
  const voxelsPerFrame = _getVoxelsPerFrameForSegment(
    labelmap3D,
    images,
    imagePlanes,
    segmentIndex
  );

  let volumeWeightedMean = 0;
  let max = voxelsPerFrame[0].values[0];
  let min = max;
  let volume = 0;

  // Calculate Min, Max, volume and mean.
  for (let i = 0; i < voxelsPerFrame.length; i++) {
    const { values, voxelInMM3 } = voxelsPerFrame[i];

    volume += voxelInMM3 * values.length;

    let sum = 0;

    values.forEach(value => {
      if (value > max) {
        max = value;
      } else if (value < min) {
        min = value;
      }

      sum += value;
    });

    volumeWeightedMean += sum * voxelInMM3;
  }

  volumeWeightedMean /= volume;

  let volumeWeightedStDev = 0;

  // Calculate the volume weigthed standard deviation.
  for (let i = 0; i < voxelsPerFrame.length; i++) {
    const { values, voxelInMM3 } = voxelsPerFrame[i];

    let stdDevSum = 0;

    values.forEach(value => {
      stdDevSum += Math.pow(value - volumeWeightedMean, 2);
    });

    volumeWeightedStDev += stdDevSum * voxelInMM3;
  }

  volumeWeightedStDev /= volume;
  volumeWeightedStDev = Math.sqrt(volumeWeightedStDev);

  return {
    volume,
    mean: volumeWeightedMean,
    stdDev: volumeWeightedStDev,
    max,
    min,
  };
}

/**
 * Returns an array of voxel values masked by the segment for each frame,
 * as well as the real world volume of a voxel on that frame.
 *
 * @param {Labelmap3D} labelmap3D The `Labelmap3D` object.
 * @param {Object[]} images An array of cornerstone images.
 * @param {Object[]} imagePlanes An array of the per-frame imagePlane metadata.
 * @param {number} segmentIndex The index of the segment to check.
 *
 * @returns {Object[]} An array of voxel values and voxel volumes per frame.
 */
function _getVoxelsPerFrameForSegment(
  labelmap3D,
  images,
  imagePlanes,
  segmentIndex
) {
  const { rowPixelSpacing, columnPixelSpacing } = images[0];
  const labelmaps2D = labelmap3D.labelmaps2D;
  const voxelsPerFrame = [];

  for (let i = 0; i < labelmaps2D.length; i++) {
    const labelmap2D = labelmaps2D[i];

    if (labelmap2D && labelmap2D.segmentsOnLabelmap.includes(segmentIndex)) {
      const sliceThickness = _getSliceThickness(images, imagePlanes, i);
      const voxelInMM3 = sliceThickness * rowPixelSpacing * columnPixelSpacing;
      const segmentationPixelData = labelmap2D.pixelData;
      const imagePixelData = images[i].getPixelData();
      const values = [];

      // Iterate over segmentationPixelData and count voxels.
      for (let p = 0; p < segmentationPixelData.length; p++) {
        if (segmentationPixelData[p] === segmentIndex) {
          values.push(imagePixelData[p]);
        }
      }

      voxelsPerFrame.push({
        voxelInMM3,
        values,
      });
    }
  }

  return voxelsPerFrame;
}

/**
 * Estimates the slice thickness given the image position patient of adjacent frames.
 * For the edges the slice thickness is assumed to be the perpendicular distance to the closest frame.
 * For all other frames the slice thickness is taken to be the sum of half of the distance to the frame above and below.
 *
 * Voxels on the first or last frame are assumed to be full occupied.
 *
 * @param {Object[]} images An array of cornerstone images.
 * @param {Object[]} imagePlanes An array of the per-frame imagePlane metadata.
 * @param {number} frameIndex The index of the frame to get the slice thickness for.
 *
 * @returns {number}
 */
function _getSliceThickness(images, imagePlanes, frameIndex) {
  const numberOfSlices = images.length;
  const ipp = imagePlanes[frameIndex].imagePositionPatient;

  // Special cases: Edge of volume - Assume thickness is the distance
  // between the current slice and the closest slice as this is all the information we have.
  if (frameIndex === 0) {
    const ippAbove = imagePlanes[frameIndex + 1].imagePositionPatient;

    return distanceBetweenSlices(ipp, ippAbove);
  } else if (frameIndex === numberOfSlices - 1) {
    const ippBelow = imagePlanes[frameIndex - 1].imagePositionPatient;

    return distanceBetweenSlices(ipp, ippBelow);
  }

  // Estimate slice thickness from the two adjacent slices.
  const ippBelow = imagePlanes[frameIndex - 1].imagePositionPatient;
  const ippAbove = imagePlanes[frameIndex + 1].imagePositionPatient;

  return (
    (distanceBetweenSlices(ipp, ippBelow) +
      distanceBetweenSlices(ipp, ippAbove)) /
    2
  );
}

/**
 * Returns the ditance between two imagePostionPatient coordinates.
 *
 * @param {number[]} ipp1 The first image position patient array.
 * @param {number[]} ipp2 The second image position patient array.
 */
function distanceBetweenSlices(ipp1, ipp2) {
  return Math.sqrt(
    Math.pow(ipp1[0] - ipp2[0], 2) +
      Math.pow(ipp1[1] - ipp2[1], 2) +
      Math.pow(ipp1[2] - ipp2[2], 2)
  );
}
