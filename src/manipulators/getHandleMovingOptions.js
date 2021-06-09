import { state } from './../store/index.js';

/**
 * Return the options related to handles' moving using global values for the
 * options not provided in the given object.
 * @public
 * @function getHandleMovingOptions
 * @memberof Manipulators
 *
 * @param {Object} [options={}] - An object containing the handles' moving options
 * @returns {Object} - The modified options object
 */
export default function(options = {}) {
  const {
    deleteIfHandleOutsideDisplayedArea,
    deleteIfHandleOutsideImage,
    preventHandleOutsideDisplayedArea,
    preventHandleOutsideImage,
  } = state;

  // Use global defaults, unless overidden by provided options
  return Object.assign(
    {},
    {
      deleteIfHandleOutsideDisplayedArea,
      deleteIfHandleOutsideImage,
      preventHandleOutsideDisplayedArea,
      preventHandleOutsideImage,
    },
    options
  );
}
