import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom';
import tooltipData from '../../assets/tooltips.json';

// All data with [data-tooltip-id] gets floating info
export default class FloatingInfo {
  constructor() {
    const tooltipElements = document.querySelectorAll('[data-tooltip-id]'),
      data = this.getData();

    tooltipElements.forEach((HTMLElement) => {
      this.setTooltip(HTMLElement, data);
    });
  }

  // Tooltip data is stored in /assets/tooltips.json, id = [data-tooltip-id]
  getData() {
    Object.freeze(tooltipData);

    return tooltipData;
  }
  // Set tooltip with Floating UI
  setTooltip(el, data) {
    const id = el.getAttribute('data-tooltip-id');

    try {
      const tooltip = data.find((entry) => entry.id === id);

      if (!tooltip) throw new Error(`Tooltip data is missing for ${id}`);

      const template = this.createTemplate(tooltip),
        tooltipEl = this.createTooltipElement(template),
        arrowEl = tooltipEl.querySelector('.floating-info-arrow');

      let cleanup = null,
        showTimer = null,
        hideTimer = null,
        isVisible = false;

      const updatePosition = () => {
          const [crossAxis, mainAxis] = this.offset(el);

          computePosition(el, tooltipEl, {
            placement: 'top',
            middleware: [
              offset({ mainAxis, crossAxis }),
              flip(),
              shift({ padding: 8 }),
              arrow({ element: arrowEl }),
            ],
          }).then(({ x, y, placement, middlewareData }) => {
            const { x: arrowX, y: arrowY } = middlewareData.arrow || {},
              staticSide = {
                top: 'bottom',
                right: 'left',
                bottom: 'top',
                left: 'right',
              }[placement.split('-')[0]];

            Object.assign(tooltipEl.style, {
              left: `${x}px`,
              top: `${y}px`,
            });

            tooltipEl.setAttribute('data-placement', placement);

            Object.assign(arrowEl.style, {
              left: arrowX != null ? `${arrowX}px` : '',
              top: arrowY != null ? `${arrowY}px` : '',
              right: '',
              bottom: '',
              [staticSide]: '-4px',
            });
          });
        },
        show = () => {
          window.clearTimeout(hideTimer);
          showTimer = window.setTimeout(() => {
            if (isVisible) return;

            isVisible = true;
            tooltipEl.setAttribute('data-state', 'visible');
            cleanup = autoUpdate(el, tooltipEl, updatePosition);
          }, 300);
        },
        hide = () => {
          window.clearTimeout(showTimer);
          hideTimer = window.setTimeout(() => {
            isVisible = false;
            tooltipEl.setAttribute('data-state', 'hidden');
            if (cleanup) cleanup();
            cleanup = null;
          }, 300);
        };

      document.body.appendChild(tooltipEl);
      tooltipEl.id = `tooltip-${id}`;
      el.setAttribute('aria-describedby', tooltipEl.id);

      el.addEventListener('mouseenter', show);
      el.addEventListener('focus', show);
      el.addEventListener('mouseleave', hide);
      el.addEventListener('blur', hide);
      tooltipEl.addEventListener('mouseenter', show);
      tooltipEl.addEventListener('mouseleave', hide);
    } catch (err) {
      console.error(
        `Failed to set the tooltip for item with a data-tooltip id of [${id}].\nCheck if there is corresponding data in tooltips.JSON`
      );
    }
  }
  // HTML template for inside tooltip
  createTemplate(tooltip) {
    const template = document.createElement('span'),
      contentP = document.createElement('p');

    contentP.className = 'content';
    contentP.innerText = tooltip.content;
    // <a> tag will only be set when there is an URL in JSON file
    if ('url' in tooltip) contentP.appendChild(this.createAnchor(tooltip.url));
    template.appendChild(contentP);

    return template;
  }

  createTooltipElement(template) {
    const tooltipEl = document.createElement('div'),
      arrowEl = document.createElement('div');

    tooltipEl.className = 'floating-info';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.setAttribute('data-state', 'hidden');
    tooltipEl.appendChild(template);

    arrowEl.className = 'floating-info-arrow';
    tooltipEl.appendChild(arrowEl);

    return tooltipEl;
  }

  createAnchor(url) {
    const anchor = document.createElement('a');

    anchor.className = 'url';
    anchor.href = url;
    anchor.innerText = 'Read More';

    return anchor;
  }

  // Calculate offset based on props if rotated, otherwise return default
  offset(el) {
    const style = window.getComputedStyle(el),
      props = el.getBoundingClientRect();

    if (style.transform === 'none') return [3, 7];
    return [props.width * 0.15 < 10 ? props.width * 0.1 : props.width * 0.2, 2];
  }
}
