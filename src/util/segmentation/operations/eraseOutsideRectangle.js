import { getBoundingBoxAroundPolygon } from '../boundaries';
import { eraseOutsideBoundingBox } from './index';

/**
 * EraseOutsideRectangle - Erase all pixels labeled with the activeSegmentIndex,
 * outside the region defined by the rectangle.
 * @param  {} evt The Cornerstone event.
 * @param {} evt.operationData An object containing the `pixelData` to
 *                          modify, the `segmentIndex` and the `points` array.
 * @returns {null}
 */
export default function eraseOutsideRectangle(evt) {
  const eventData = evt.detail;
  const { operationData } = evt;
  const { points } = operationData;

  const { image } = eventData;

  const vertices = points.map(a => [a.x, a.y]);
  const [topLeft, bottomRight] = getBoundingBoxAroundPolygon(vertices, image);

  eraseOutsideBoundingBox(evt, topLeft, bottomRight);
}
