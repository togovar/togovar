import { directive, AsyncDirective } from 'lit/async-directive.js';
import { noChange, nothing } from 'lit';

let previousRole;
const disconnectedRects = new Map();
class Flip extends AsyncDirective {
  parent;
  element;
  boundingRect;
  id;
  changedToHero = false;

  // render() {
  //   return nothing;
  // }

  update(part, [{ id = undefined, role = '', options = {} } = {}]) {
    this.id = id;
    this.options = {
      ...this.options,
      ...options,
    };

    if (!previousRole) {
      previousRole = role;
    }

    if (previousRole && previousRole !== 'hero' && role === 'hero') {
      previousRole = role;
      this.changedToHero = true;
    }

    if (this.element !== part.element) {
      this.element = part.element;
      requestAnimationFrame(() => {
        this.parent =
          this.element.parentElement ||
          this.element.shadowRoot.getRootNode().host;
      });
    }
    // memorize boundingRect before element updates
    if (this.boundingRect) {
      this.boundingRect = this.element.getBoundingClientRect();
    }

    // the timing on which LitElement batches its updates, to capture the "last" frame of our animation.
    Promise.resolve().then(() => this.prepareToFlip());
    return noChange;
  }

  prepareToFlip() {
    if (!this.boundingRect) {
      this.boundingRect = disconnectedRects.has(this.id)
        ? disconnectedRects.get(this.id)
        : this.element.getBoundingClientRect();
      disconnectedRects.delete(this.id);
    }
    this.flip();
  }

  flip(listener, removing) {
    const previous = this.boundingRect;

    // current position
    this.boundingRect = this.element.getBoundingClientRect();

    const deltaY = previous.y - this.boundingRect.y;
    if (!deltaY && !removing) {
      return;
    }

    const filteredListener = (event) => {
      if (event.target === this.element) {
        listener(event);
        this.element.removeEventListener('transitionend', filteredListener);
      }
    };

    this.element.addEventListener('transitionend', filteredListener);

    this.element.animate(
      [
        {
          transform: `translate(0, ${deltaY}px)`,
        },
        {
          transform: `translate(0,0)`,
        },
      ],
      {
        duration: 1000,
        easing: 'ease-out',
      }
    );
  }

  // TODO whan changed
  disconnected() {
    //this.boundingRect = this.element.getBoundingClientRect();
    disconnectedRects.set(this.id, this.boundingRect);

    if (typeof this.id !== 'undefined') {
      requestAnimationFrame(() => {
        this.parent.append(this.element);
        this.changedToHero = false;
      });

      this.element.animate(
        [
          {
            opacity: 1,
          },
          {
            opacity: 0,
          },
        ],
        {
          duration: 1000,
          easing: 'ease-out',
        }
      ).onfinish = () => {
        if (disconnectedRects.has(this.id)) {
          disconnectedRects.delete(this.id);
        }
        this.element.remove();
      };
    }
  }
}

export const flip = directive(Flip);
