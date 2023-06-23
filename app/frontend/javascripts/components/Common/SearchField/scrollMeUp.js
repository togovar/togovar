import { directive, AsyncDirective } from 'lit/async-directive.js';

class ScrollMeUp extends AsyncDirective {
  update(part, [selected]) {
    if (selected && part.element.parentElement) {
      this._scrollParentToChild(part.element.parentElement, part.element);
    }
  }
  _scrollParentToChild(parent, child) {
    const parentRect = parent.getBoundingClientRect();
    const parentViewableArea = {
      height: parent.clientHeight,
      width: parent.clientWidth,
    };

    const childRect = child.getBoundingClientRect();
    const isViewable =
      childRect.top >= parentRect.top &&
      childRect.bottom <= parentRect.top + parentViewableArea.height;

    if (!isViewable) {
      const scrollTop = childRect.top - parentRect.top;
      const scrollBot = childRect.bottom - parentRect.bottom;
      if (Math.abs(scrollTop) < Math.abs(scrollBot)) {
        parent.scrollTop += scrollTop;
      } else {
        parent.scrollTop += scrollBot;
      }
    }
  }
}

export const scrollMeUp = directive(ScrollMeUp);
