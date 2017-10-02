import { cornerstone } from '../externalImports.js';

// This function causes the target image to be drawn immediately
export default function (synchronizer, sourceElement, targetElement) {

    // Ignore the case where the source and target are the same enabled element
  if (targetElement === sourceElement) {
    return;
  }

  cornerstone.updateImage(targetElement);
}
