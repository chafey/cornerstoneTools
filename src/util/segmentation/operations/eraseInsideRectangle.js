import { getLogger } from '../../logger';
import getBoundingBoxAroundPolygon from '../boundaries/getBoundingBoxAroundPolygon.js';
import eraseInsideShape from '../helpers/eraseInsideShape';

const logger = getLogger('util:segmentation:operations:eraseInsideRectangle');

/**
 * EraseInsideRectangle - Erase all pixels inside the region defined
 * by the rectangle.
 * @param  {Object} evt The Cornerstone event.
 * @param  {Object} toolConfiguration Configuration of the tool applying the strategy.
 * @param  {Object} operationData An object containing the `pixelData` to
 *                          modify, the `segmentIndex` and the `points` array.
 * @returns {null}
 */
export default function eraseInsideRectangle(
  evt,
  toolConfiguration,
  operationData
) {
  const { points, segmentationMixinType } = operationData;

  if (segmentationMixinType !== `rectangleSegmentationMixin`) {
    logger.error(
      `eraseInsideRectangle operation requires rectangleSegmentationMixin operationData, recieved ${segmentationMixinType}`
    );

    return;
  }

  const eventData = evt.detail;

  // Loop through all pixels in the segmentation data mask

  // Obtain the bounding box of the entire drawing so that
  // we can subset our search.
  const { image } = eventData;
  const vertices = points.map(a => [a.x, a.y]);
  const [topLeft, bottomRight] = getBoundingBoxAroundPolygon(vertices, image);

  eraseInsideShape(evt, operationData, () => true, topLeft, bottomRight);
}
