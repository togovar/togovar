import { directive, AsyncDirective } from 'lit/async-directive.js';
import { nothing } from 'lit';

const disconnectedRects = new Map();
const parentDivs = new Map();

const hasNoMotionPreference = window.matchMedia(
  '(prefers-reduced-motion: no-preference)'
);

class Flip extends AsyncDirective {
  parent;
  element;
  boundingRect;
  id;
  options = {
    delay: 0,
    duration: 10000,
    timingFunction: 'ease-in-out',
  };

  render() {
    return nothing;
  }

  // The update() callback receives two arguments:
  // A Part object with an API for directly managing the DOM associated with the expression.
  // An array containing the render() arguments.

  update(part, [{ id = undefined, options = {} } = {}]) {
    this.id = id;
    this.options = {
      ...this.options,
      ...options,
    };

    console.log('part', part);
    if (this.element !== part.element) {
      this.element = part.element;
      requestAnimationFrame(() => {
        // parent new

        this.parent = this.element.parentElement || this.element.getRootNode();
      });
    }
    // memorize boundingRect before element updates
    if (this.boundingRect) {
      this.boundingRect = this.element.getBoundingClientRect();
    }
    if (!hasNoMotionPreference.matches) {
      return;
    }

    // the timing on which LitElement batches its updates, to capture the "last" frame of our animation.
    Promise.resolve().then(() => this.prepareToFlip());
  }

  // instantly after dom update by $repeat
  prepareToFlip() {
    // when repeat removes the element from the DOM, it will be added to disconnectedRects
    // and when it is connected (into another div), it will search for it in disconnectedRects and use it as first position
    if (!this.boundingRect) {
      this.boundingRect = disconnectedRects.has(this.id)
        ? disconnectedRects.get(this.id)
        : this.element.getBoundingClientRect();
      disconnectedRects.delete(this.id);
    }

    const newParentId = this.element.parentElement.getAttribute('id');

    const newParent = this.element.getRootNode().getElementById(newParentId);

    this.container = this.element.parentElement.parentElement;
    this.parentRect = this.container.getBoundingClientRect();

    this.flip(
      {
        // left: this.boundingRect.left - parentRect.left + 'px',
        // top: this.boundingRect.right - parentRect.top + 'px',
      },
      {
        // position: 'relative', transform: 'translate(0px, 0px)'
      },
      () => {
        if (this.clone) {
          console.log('removing clone');
          this.clone.remove();
        }
        this.element.removeAttribute('style');
        // return element to its parent
        // newParent.appendChild(this.element);
        // this.cardContainer.appendChild(this.element);
        this.boundingRect = this.element.getBoundingClientRect();
      }
    );
  }

  applyStyles(styleMap) {
    for (const property in styleMap) {
      this.clone.style[property] = styleMap[property];
    }
  }

  flip(firstStyleMap, lastStyleMap, listener, removing) {
    // previous position
    const previous = this.boundingRect;
    const previousRelativeX = previous.left - this.parentRect.left;
    const previousRelativeY = previous.top - this.parentRect.top;

    // current position
    this.boundingRect = this.element.getBoundingClientRect();
    const currentRelativeX = this.boundingRect.left - this.parentRect.left;
    const currentRelativeY = this.boundingRect.top - this.parentRect.top;

    const deltaX = previous.x - this.boundingRect.x;
    const deltaY = previous.y - this.boundingRect.y;
    if (!deltaX && !deltaY && !removing) {
      return;
    }

    // create clone and append it to top level

    this.clone = this.element.cloneNode(true);
    this.element.style.opacity = 0;

    for (let i in this.element.properties) {
      this.clone[i] = this.element[i];
    }
    this.clone.__data = this.element.__data;

    this.container.appendChild(this.clone);

    const filteredListener = (event) => {
      if (event.target === this.clone) {
        listener(event);
        this.clone.removeEventListener('transitionend', filteredListener);
      }
    };

    this.clone.addEventListener('transitionend', filteredListener);

    //this.container.appendChild(this.element);

    const translateFirst = `translate(${previousRelativeX}px, ${previousRelativeY}px)`;
    const translateLast = `translate(${currentRelativeX}px, ${currentRelativeY}px)`;

    // here we already know that this element will be moving.
    // so we need :
    // 1. get  relative to its parent's parent position to use in translate. (as "first" position)
    //   a. get the parent's parent position
    //   b. get the element position
    //   c. get the delta
    // 2. get the "last" position relative to the parent's parent

    // 2. append the element to the parent's parent
    // 3. apply the translate to the element with position:absolute

    this.applyStyles({
      ...firstStyleMap,
      position: 'absolute',
      transform: `${translateFirst} ${firstStyleMap.transform ?? ''}`,
    });

    requestAnimationFrame(() => {
      const transition = `transform ${this.options.duration}ms ${this.options.timingFunction} ${this.options.delay}ms`;
      this.applyStyles({
        ...lastStyleMap,
        transition,
        position: 'absolute',
        // if element is removing, set transform as it was, e.g. to the "first" position, if not- remove it, e.g. set it to the "last" position. Add transition to animate the removal of backward transform.
        transform: `${removing ? `${translateLast} ` : `${translateLast}`}${
          lastStyleMap.transform ?? ''
        }`,
      });
    });
  }

  remove() {
    // append element to its last known parent back
    //this.parent.append(this.element);
    // and flip animate its removal.
    this.flip(
      {},
      {
        display: 'block',
        marginBottom: '7px',
        transform: 'translate(0,2000%)',
        opacity: '0.5',
      },
      () => {
        this.clone.remove();
        this.element.remove();
        disconnectedRects.delete(this.id);
      },
      true
    );
  }

  // if element is removing from dom, it will be added to disconnectedRects, and flip with removing=true will be called
  disconnected() {
    if (!hasNoMotionPreference.matches) {
      return;
    }

    this.boundingRect = this.element.getBoundingClientRect();
    if (typeof this.id !== 'undefined') {
      disconnectedRects.set(this.id, this.boundingRect);
      requestAnimationFrame(() => {
        if (disconnectedRects.has(this.id)) {
          this.remove();
        }
      });
    }
  }
}

export const flip = directive(Flip);
