import { directive, AsyncDirective } from 'lit/async-directive.js';
import { noChange, nothing } from 'lit';

class Flip extends AsyncDirective {
  parent;
  element;
  boundingRect;
  id;

  update(part, [{ id = undefined, options = {} } = {}]) {
    const firstElement = part.element;
    // Don't animate first render
    if (!firstElement.isConnected) {
      return;
    }
    // Capture render position before update
    const first = firstElement.getBoundingClientRect();
    // Nodes may be re-used so identify via a key.
    const container = firstElement.parentNode;
    const key = firstElement.getAttribute('key');
    requestAnimationFrame(() => {
      // Find matching element.
      const lastElement = container.querySelector(`[key="${key}"]`);
      if (!lastElement) {
        return;
      }
      // Capture render position after update
      const last = lastElement.getBoundingClientRect();
      // Calculate deltas and animate if something changed.
      const topChange = first.top - last.top;
      if (topChange !== 0) {
        lastElement.animate(
          [{ transform: `translateY(${topChange}px)` }, {}],
          options
        ).onfinish = onfinish;
      }
    });
  }
}

export const flipColumn = directive(Flip);

// export const flipColumn = directive(
//   (options = { duration: 300 }, onfinish) =>
//     (part) => {
//       const firstElement = part.committer.element;
//       // Don't animate first render
//       if (!firstElement.isConnected) {
//         return;
//       }
//       // Capture render position before update
//       const first = firstElement.getBoundingClientRect();
//       // Nodes may be re-used so identify via a key.
//       const container = firstElement.parentNode;
//       const key = firstElement.getAttribute('key');
//       requestAnimationFrame(() => {
//         // Find matching element.
//         const lastElement = container.querySelector(`[key="${key}"]`);
//         if (!lastElement) {
//           return;
//         }
//         // Capture render position after update
//         const last = lastElement.getBoundingClientRect();
//         // Calculate deltas and animate if something changed.
//         const topChange = first.top - last.top;
//         if (topChange !== 0) {
//           lastElement.animate(
//             [{ transform: `translateY(${topChange}px)` }, {}],
//             options
//           ).onfinish = onfinish;
//         }
//       });
//     }
// );
