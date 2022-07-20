import { directive, AsyncDirective } from 'lit/async-directive.js';
import { nothing } from 'lit';

const disconnectedRects = new Map();

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
    duration: 300,
    timingFunction: 'ease-in-out',
  };

  render() {
    return nothing;
  }

  update(part, [{ id = undefined, options = {} } = {}]) {
    this.id = id;
    this.options = {
      ...this.options,
      ...options,
    };
    if (this.element !== part.element) {
      this.element = part.element;
      requestAnimationFrame(() => {
        this.parent = this.element.parentElement || this.element.getRootNode();
      });
    }
    if (this.boundingRect) {
      this.boundingRect = this.element.getBoundingClientRect();
    }
    if (!hasNoMotionPreference.matches) {
      return;
    }
    Promise.resolve().then(() => this.prepareToFlip());
  }

  prepareToFlip() {
    if (!this.boundingRect) {
      this.boundingRect = disconnectedRects.has(this.id)
        ? disconnectedRects.get(this.id)
        : this.element.getBoundingClientRect();
      disconnectedRects.delete(this.id);
    }
    this.flip({ zIndex: '1' }, { transform: 'translate(0px, 0px)' }, () => {
      this.element.removeAttribute('style');
      this.boundingRect = this.element.getBoundingClientRect();
    });
  }

  applyStyles(styleMap) {
    for (const property in styleMap) {
      this.element.style[property] = styleMap[property];
    }
  }

  flip(firstStyleMap, lastStyleMap, listener, removing) {
    const previous = this.boundingRect;
    this.boundingRect = this.element.getBoundingClientRect();
    const deltaX = previous.x - this.boundingRect.x;
    const deltaY = previous.y - this.boundingRect.y;
    if (!deltaX && !deltaY && !removing) {
      return;
    }
    const filteredListener = (event) => {
      if (event.target === this.element) {
        listener(event);
        this.element.removeEventListener('transitionend', filteredListener);
      }
    };
    this.element.addEventListener('transitionend', filteredListener);
    const translate = `translate(${deltaX}px, ${deltaY}px)`;
    this.applyStyles({
      ...firstStyleMap,
      transform: `${translate} ${firstStyleMap.transform ?? ''}`,
    });
    requestAnimationFrame(() => {
      const transition = `transform ${this.options.duration}ms ${this.options.timingFunction} ${this.options.delay}ms`;
      this.applyStyles({
        ...lastStyleMap,
        transition,
        transform: `${removing ? `${translate} ` : ''}${
          lastStyleMap.transform ?? ''
        }`,
      });
    });
  }

  remove() {
    this.parent.append(this.element);
    this.flip(
      { zIndex: '-1' },
      {
        transform: 'scale(0.5)',
        opacity: '0.5',
      },
      () => {
        this.element.remove();
        disconnectedRects.delete(this.id);
      },
      true
    );
  }

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
